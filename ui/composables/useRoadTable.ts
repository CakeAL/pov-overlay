import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  roadIdentity,
  roadMappingKey,
  mappingFor,
  type RoadMapping,
} from "../domain/roadIdentity";
import type { LocationAddress } from "../domain/location";
import { routeLocationQueries } from "../domain/routeLocationQueries";
import { lookupLocation } from "../infrastructure/maps/geocoding";
import { isAborted } from "../infrastructure/maps/requestCache";
import { mapRuntimeSettings } from "../infrastructure/maps/runtime";
import { validateWidgets } from "../infrastructure/documents/schema";
import type { Timeline } from "./useTimeline";
import type { WidgetLayout } from "./useWidgetLayout";
import type { EditorMessages } from "./useMessages";
import type { useLocationLabels } from "./useLocationLabels";
export function useRoadTable(
  timeline: Timeline,
  layout: WidgetLayout,
  location: ReturnType<typeof useLocationLabels>,
  messages: EditorMessages,
) {
  const opened = ref(false),
    busy = ref(false),
    processed = ref(0),
    draft = ref<RoadMapping[]>([]),
    detected = ref<RoadMapping[]>([]),
    targetId = ref("");
  const target = computed(() =>
    layout.widgets.value.find((w) => w.id === targetId.value),
  );
  const track = computed(() => timeline.context.value.track);
  let request: AbortController | undefined;
  const seen = new Set<string>();
  function merge(rows: RoadMapping[], row: RoadMapping) {
    if (
      rows.length < 2000 &&
      !mappingFor({ ...row, road: row.name, district: "", street: "" }, rows)
    )
      rows.push(row);
  }
  function discover(address: LocationAddress | null) {
    if (!address?.road.trim()) return;
    const identity = roadIdentity(address);
    const row: RoadMapping = {
      name: address.road.trim(),
      province: address.province,
      city: address.city,
      code: identity?.code ?? "",
      type: identity?.type,
    };
    const key = roadMappingKey(row);
    if (!seen.has(key) && detected.value.length < 2000) {
      seen.add(key);
      detected.value.push(row);
    }
    if (opened.value) merge(draft.value, { ...row });
  }
  watch(location.address, discover);
  function cancel() {
    request?.abort();
  }
  watch(track, () => {
    cancel();
    detected.value = [];
    seen.clear();
  });
  watch(opened, (value) => {
    if (!value) cancel();
  });
  watch(
    () => layout.selected.value?.id,
    () => {
      opened.value = false;
    },
  );
  function open() {
    const widget = layout.selected.value;
    if (!widget?.svg?.roadInfo || widget.locked) return;
    targetId.value = widget.id;
    draft.value = structuredClone(
      JSON.parse(JSON.stringify(widget.svg.roadInfo.roads ?? [])),
    );
    discover(location.address.value);
    for (const row of detected.value) merge(draft.value, { ...row });
    opened.value = true;
  }
  function add() {
    if (draft.value.length >= 2000) {
      messages.report(new Error("道路编号表最多 2000 条。"));
      return;
    }
    draft.value.push({
      name: "",
      province: location.address.value?.province ?? "",
      city: location.address.value?.city ?? "",
      code: "",
    });
  }
  async function scan() {
    if (busy.value || !track.value) return;
    request = new AbortController();
    const signal = request.signal,
      currentTrack = track.value;
    busy.value = true;
    processed.value = 0;
    try {
      for (const query of routeLocationQueries(
        currentTrack,
        mapRuntimeSettings().locationRefreshSeconds,
      )) {
        if (signal.aborted) break;
        const address = await lookupLocation(query, signal);
        if (signal.aborted) break;
        discover(address);
        processed.value++;
        if (detected.value.length >= 2000) {
          messages.notice.value = "道路表达到 2000 条，识别已停止。";
          break;
        }
      }
    } catch (reason) {
      if (!isAborted(reason)) messages.report(reason);
    } finally {
      busy.value = false;
    }
  }
  function save() {
    const widget = target.value;
    if (!widget?.svg?.roadInfo || widget.locked) return;
    try {
      const value = validateWidgets([
        {
          ...widget,
          svg: {
            ...widget.svg,
            roadInfo: { ...widget.svg.roadInfo, roads: draft.value },
          },
        },
      ])[0]!;
      layout.remember();
      widget.svg.roadInfo = value.svg!.roadInfo;
      opened.value = false;
    } catch (reason) {
      messages.report(reason);
    }
  }
  onBeforeUnmount(cancel);
  return {
    opened,
    busy,
    processed,
    draft,
    open,
    add,
    scan,
    cancel,
    save,
    canScan: computed(() => !!track.value),
  };
}
