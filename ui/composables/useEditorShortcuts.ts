import { onBeforeUnmount, onMounted } from "vue";
import type { WidgetLayout } from "./useWidgetLayout";
import type { Playback } from "./usePlayback";
import type { CanvasViewport } from "./useCanvasViewport";

export function useEditorShortcuts(
  layout: WidgetLayout,
  playback: Playback,
  viewport: CanvasViewport,
) {
  const { selected, remember, undo, redo, clampWidget } = layout;
  const { togglePlay } = playback;
  const { stageSize } = viewport;
  function handleKey(event: KeyboardEvent) {
    if (
      (event.target as HTMLElement).closest(
        'input, textarea, select, button, [contenteditable="true"]',
      )
    )
      return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      void togglePlay();
      return;
    }
    if (
      selected.value &&
      !selected.value.locked &&
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      event.preventDefault();
      remember();
      const amount = event.shiftKey ? 10 : 1;
      if (event.key === "ArrowLeft")
        selected.value.x -= amount / stageSize.value.width;
      if (event.key === "ArrowRight")
        selected.value.x += amount / stageSize.value.width;
      if (event.key === "ArrowUp")
        selected.value.y -= amount / stageSize.value.height;
      if (event.key === "ArrowDown")
        selected.value.y += amount / stageSize.value.height;
      clampWidget(selected.value);
    }
  }

  onMounted(() => window.addEventListener("keydown", handleKey));
  onBeforeUnmount(() => window.removeEventListener("keydown", handleKey));
}
