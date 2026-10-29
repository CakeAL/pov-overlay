// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { createApp, computed, ref, nextTick } from "vue";
import { roadIdentity } from "../domain/roadIdentity";
import { routeLocationQueries } from "../domain/routeLocationQueries";
import { useRoadTable } from "../composables/useRoadTable";
import { useWidgetLayout } from "../composables/useWidgetLayout";
import { lookupLocation } from "../infrastructure/maps/geocoding";
import type { Track, Widget } from "../domain/types";
import type { Timeline } from "../composables/useTimeline";
import type { EditorMessages } from "../composables/useMessages";
import type { useLocationLabels } from "../composables/useLocationLabels";
vi.mock("../infrastructure/maps/geocoding", () => ({
  lookupLocation: vi.fn(),
}));
const address = (road: string) => ({
  road,
  province: "广东省",
  city: "深圳市",
  district: "",
  street: "",
});
const track: Track = {
  name: "route",
  startMs: 0,
  endMs: 105000,
  distanceMeters: 100,
  skippedPoints: 0,
  samples: [0, 5000, 10000, 100000, 105000].map((timestampMs, i) => ({
    timestampMs,
    latitude: 30 + i * 0.01,
    longitude: 120,
    elevation: null,
    speedMps: 10,
    segment: i < 3 ? 0 : 1,
  })),
};
test("whole-route discovery uses shared buckets, skips gaps and starts fresh segments", () => {
  const queries = [...routeLocationQueries(track, 5)];
  expect(queries).toHaveLength(5);
  expect(queries[0]!.latitude).toBe(30);
  expect(queries[3]!.latitude).toBe(30.03);
});
test("scans distinct names, preserves edits, saves scoped rows with undo and stops cancelled work", async () => {
  const layout = useWidgetLayout(ref(16 / 9), ref<HTMLElement>());
  const widget: Widget = {
    id: "roads",
    kind: "svg",
    label: "道路",
    x: 0,
    y: 0,
    scale: 1,
    opacity: 0,
    color: "#ffffff",
    visible: true,
    locked: false,
    svg: {
      source: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 100"/>',
      aspectRatio: 7.2,
      roadInfo: {},
    },
  };
  layout.widgets.value = [widget];
  layout.selectedId.value = widget.id;
  const location = {
    address: ref<ReturnType<typeof address> | null>(null),
  } as ReturnType<typeof useLocationLabels>;
  const timeline = { context: computed(() => ({ track })) } as Timeline;
  const report = vi.fn(),
    messages = { report } as unknown as EditorMessages;
  let table!: ReturnType<typeof useRoadTable>;
  const app = createApp({
    setup() {
      table = useRoadTable(timeline, layout, location, messages);
      return () => null;
    },
  });
  app.mount(document.createElement("div"));
  try {
    location.address.value = address("松白路");
    await nextTick();
    table.open();
    expect(table.draft.value[0]!.name).toBe("松白路");
    table.draft.value[0]!.code = "G107";
    vi.mocked(lookupLocation)
      .mockResolvedValueOnce(address("松白路"))
      .mockResolvedValue(address("沈海高速"));
    await table.scan();
    expect(table.processed.value).toBe(5);
    expect(table.draft.value.map((r) => r.name)).toEqual([
      "松白路",
      "沈海高速",
    ]);
    expect(table.draft.value[0]!.code).toBe("G107");
    table.draft.value[1]!.code = "G15";
    table.save();
    expect(report).not.toHaveBeenCalled();
    const options = layout.widgets.value[0]!.svg!.roadInfo;
    expect(roadIdentity(address("松白路"), options)?.code).toBe("G107");
    expect(roadIdentity(address("沈海高速"), options)?.code).toBe("G15");
    expect(roadIdentity(address("其它路"), options)).toBeNull();
    layout.undo();
    expect(layout.widgets.value[0]!.svg!.roadInfo?.roads).toBeUndefined();
    layout.redo();
    expect(layout.widgets.value[0]!.svg!.roadInfo?.roads).toHaveLength(2);
    table.open();
    let complete!: (value: ReturnType<typeof address>) => void;
    vi.mocked(lookupLocation).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const pending = table.scan();
    table.cancel();
    complete(address("取消后的路"));
    await pending;
    expect(table.draft.value.some((r) => r.name === "取消后的路")).toBe(false);
  } finally {
    app.unmount();
  }
});
