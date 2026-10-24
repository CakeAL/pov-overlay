import { ref, computed } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { native } from "../infrastructure/media";
import { sanitizeSvg } from "../infrastructure/svg";
import { TELEMETRY_STRIP } from "../domain/telemetryStrip";
import { TELEMETRY_ITEMS, ALL_TELEMETRY_ITEMS, type TelemetryItem } from "../domain/telemetryItems";
import type { Widget } from "../domain/types";
import type { WidgetLayout } from "./useWidgetLayout";
import type { EditorMessages } from "./useMessages";
export function useSvgElements(layout: WidgetLayout, messages: EditorMessages) {
  const svgInput = ref<HTMLInputElement>();
  const legacyStrip = sanitizeSvg(TELEMETRY_STRIP);
  const canSplitTelemetryStrip = computed(
    () => layout.selected.value?.svg?.source === legacyStrip.source,
  );
  function insert(values: Widget[], replaceId?: string) {
    if (
      layout.widgets.value.length + values.length - (replaceId ? 1 : 0) >
      100
    ) {
      messages.report(new Error("最多添加 100 个画布元素。"));
      return;
    }
    layout.remember();
    if (replaceId) {
      const index = layout.widgets.value.findIndex(
        (widget) => widget.id === replaceId,
      );
      layout.widgets.value.splice(index, 1, ...values);
    } else layout.widgets.value.push(...values);
    layout.selectedId.value = values[0]?.id ?? "";
    values.forEach(layout.clampWidget);
  }
  function addSvg(source: string, name: string, width = 0.3) {
    const svg = sanitizeSvg(source);
    const widget = {
      id: crypto.randomUUID(),
      kind: "svg" as const,
      label: name,
      x: 0.05,
      y: 0.05,
      scale: 1,
      opacity: 0,
      color: "#ffffff",
      visible: true,
      locked: false,
      svg,
      widthRatio: width,
    };
    insert([widget]);
  }
  async function chooseSvg() {
    if (!native) {
      svgInput.value?.click();
      return;
    }
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: "SVG 元素", extensions: ["svg"] }],
      });
      if (typeof path === "string")
        addSvg(
          await invoke<string>("read_svg", { path }),
          path.split(/[\\/]/).at(-1)!,
        );
    } catch (reason) {
      messages.report(reason);
    }
  }
  async function selectedSvg(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    try {
      if (file) {
        if (file.size > 2 * 1024 * 1024) throw new Error("SVG 不能超过 2 MB。");
        addSvg(await file.text(), file.name);
      }
    } catch (reason) {
      messages.report(reason);
    } finally {
      input.value = "";
    }
  }
  function makeItem(item: TelemetryItem, parent: Widget): Widget {
    const size = layout.dimensions(parent);
    return {
      ...parent,
      id: crypto.randomUUID(),
      label: item.label,
      x: parent.x + (size.width * item.x) / 960,
      y: parent.y + (size.height * item.y) / 130,
      widthRatio: (size.width * item.width) / 960 / parent.scale,
      svg: sanitizeSvg(item.source),
    };
  }
  function stripAnchor(): Widget {
    return {
      id: "",
      kind: "svg",
      label: "数据条",
      x: 0.05,
      y: 0.78,
      scale: 1,
      opacity: 0,
      color: "#ffffff",
      visible: true,
      locked: false,
      widthRatio: 0.9,
      svg: legacyStrip,
    };
  }
  function addMinimap() {
    insert([{ id: crypto.randomUUID(), kind: 'minimap', label: 'OpenStreetMap', x: 0.05, y: 0.05, widthRatio: 0.24, scale: 1, opacity: 0, color: '#709f43', visible: true, locked: false, map: { zoom: 14, shape: 'circle', headingUp: false, showRoute: true } }]);
  }
  function addRoute() {
    insert([{ id: crypto.randomUUID(), kind: 'route', label: '路线', x: 0.05, y: 0.05, widthRatio: 0.22, scale: 1, opacity: 0, color: '#c7f284', visible: true, locked: false, route: { mode: 'full', windowSeconds: 120, headingUp: false } }]);
  }
  function addTelemetryStrip() {
    const parent = stripAnchor();
    layout.clampWidget(parent);
    insert(TELEMETRY_ITEMS.map((item) => makeItem(item, parent)));
  }
  function addTelemetryItem(key: string) {
    const item = ALL_TELEMETRY_ITEMS.find((item) => item.key === key);
    if (!item) return;
    const widget = makeItem(item, stripAnchor());
    widget.x = 0.05;
    widget.y = 0.05;
    insert([widget]);
  }
  function splitTelemetryStrip() {
    if (!canSplitTelemetryStrip.value || !layout.selected.value) return;
    const parent = layout.selected.value;
    insert(
      TELEMETRY_ITEMS.map((item) => makeItem(item, parent)),
      parent.id,
    );
  }
  function removeSelected() {
    if (!layout.selected.value) return;
    layout.remember();
    layout.widgets.value = layout.widgets.value.filter(
      (w) => w.id !== layout.selectedId.value,
    );
    layout.selectedId.value = layout.widgets.value[0]?.id ?? "";
  }
  return {
    svgInput,
    chooseSvg,
    selectedSvg,
    addSvg,
    addRoute,
    addMinimap,
    addTelemetryStrip,
    addTelemetryItem,
    splitTelemetryStrip,
    canSplitTelemetryStrip,
    removeSelected,
  };
}
