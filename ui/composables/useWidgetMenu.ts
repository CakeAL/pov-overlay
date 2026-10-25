import { ref, watch } from "vue";
import type { WidgetLayout } from "./useWidgetLayout";
export function useWidgetMenu(layout: WidgetLayout) {
  const targetId = ref(""), x = ref(0), y = ref(0);
  function close() { targetId.value = ""; }
  function open(event: MouseEvent, id: string) {
    event.preventDefault(); event.stopPropagation();
    layout.selectedId.value = id;
    x.value = Math.max(8, Math.min(window.innerWidth - 186, event.clientX));
    y.value = Math.max(8, Math.min(window.innerHeight - 58, event.clientY));
    targetId.value = id;
  }
  function remove() {
    const id = targetId.value;
    close(); layout.removeWidget(id);
    layout.selectedId.value && document.querySelector<HTMLElement>(`[data-testid="widget-${CSS.escape(layout.selectedId.value)}"]`)?.focus({ preventScroll: true });
  }
  watch(() => layout.widgets.value.some(widget => widget.id === targetId.value), exists => { if (!exists) close(); });
  return { targetId, x, y, open, close, remove };
}
