import type { MapProvider } from "../domain/appSettings";
import { ref, computed } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { native } from "../infrastructure/media";
import { sanitizeSvg } from "../infrastructure/svg";
import { DEFAULT_LOCATION_TEXT, textOverlaySource } from "../domain/textOverlay";
import { TELEMETRY_STRIP } from "../domain/telemetryStrip";
import { TELEMETRY_ITEMS, ALL_TELEMETRY_ITEMS, type TelemetryItem } from "../domain/telemetryItems";
import { showSvgSource } from "../infrastructure/platform";
import type { SvgOrigin, Widget } from "../domain/types";
import type { WidgetLayout } from "./useWidgetLayout";
import type { EditorMessages } from "./useMessages";
export function useSvgElements(layout: WidgetLayout, messages: EditorMessages, defaultProvider: () => MapProvider = () => 'osm') {
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
  function addSvg(source: string, name: string, width = 0.3, origin: SvgOrigin = {}) {
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
      svg: { ...svg, ...origin },
      widthRatio: width,
    };
    insert([widget]);
  }
  async function inspectSource(source: string, label: string, origin: SvgOrigin = {}) {
    try { await showSvgSource(sanitizeSvg(source).source, label, origin); }
    catch (reason) { messages.report(reason); }
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
          0.3, { sourcePath: path },
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
      widthRatio: ((parent.scale > 0 ? size.width / parent.scale : parent.widthRatio ?? 0.9) * item.width) / 960,
      svg: { ...sanitizeSvg(item.source), ...(item.key === 'roadInfo' ? { roadInfo: { badgePosition: 'before' as const, showEnglish: true } } : {}) },
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
    insert([{ id: crypto.randomUUID(), kind: 'minimap', label: '小地图', x: 0.05, y: 0.05, widthRatio: 0.24, scale: 1, opacity: 0, color: '#709f43', visible: true, locked: false, map: { provider: defaultProvider(), zoom: 14, shape: 'circle', headingUp: false, showRoute: true } }]);
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
    if (key === 'roadInfo') widget.widthRatio = .42;
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
  function removeSelected() { layout.removeWidget(layout.selectedId.value); }
  function addText() {
    const template = DEFAULT_LOCATION_TEXT;
    const svg = sanitizeSvg(textOverlaySource(template));
    insert([{ id: crypto.randomUUID(), kind: 'svg', label: '自定义文本', x: 0.05, y: 0.05, widthRatio: 0.5, scale: 1, opacity: 0, color: '#ffffff', visible: true, locked: false, svg: { ...svg, textTemplate: template } }]);
  }
  function updateText(template: string) {
    const widget = layout.selected.value;
    if (!widget?.svg || widget.svg.textTemplate == null || widget.locked) return false;
    if (widget.svg.textTemplate === template) return true;
    try {
      const svg = sanitizeSvg(textOverlaySource(template));
      layout.remember();
      widget.svg = { ...svg, textTemplate: template };
      layout.clampWidget(widget);
      return true;
    } catch (reason) { messages.report(reason); return false; }
  }
  return {
    svgInput,
    chooseSvg,
    selectedSvg,
    addSvg, inspectSource,
    addText, updateText,
    addRoute,
    addMinimap,
    addTelemetryStrip,
    addTelemetryItem,
    splitTelemetryStrip,
    canSplitTelemetryStrip,
    removeSelected,
  };
}
