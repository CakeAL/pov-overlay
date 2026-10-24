import { ref } from "vue";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { native } from "../infrastructure/media";
import { sanitizeSvg } from "../infrastructure/svg";
import { TELEMETRY_STRIP } from "../domain/telemetryStrip";
import type { WidgetLayout } from "./useWidgetLayout";
import type { EditorMessages } from "./useMessages";
export function useSvgElements(layout: WidgetLayout, messages: EditorMessages) {
  const svgInput = ref<HTMLInputElement>();
  function addSvg(source: string, name: string, width = 0.3) {
    const svg = sanitizeSvg(source);
    layout.remember();
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
    layout.widgets.value.push(widget);
    layout.selectedId.value = widget.id;
    layout.clampWidget(widget);
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
  function addTelemetryStrip() {
    addSvg(TELEMETRY_STRIP, "数据条", 0.9);
    const widget = layout.selected.value!;
    widget.y = 0.78;
    layout.clampWidget(widget);
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
    addTelemetryStrip,
    removeSelected,
  };
}
