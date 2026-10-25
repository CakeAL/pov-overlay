import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
export function useCanvasViewport(ratio: Ref<number>) {
  const stage = ref<HTMLElement>(), stageWrap = ref<HTMLElement>();
  const fitSize = ref({ width: 960, height: 540 });
  const zoom = ref(1), pan = ref({ x: 0, y: 0 }), panMode = ref(false), panning = ref(false);
  const stageSize = computed(() => ({ width: fitSize.value.width * zoom.value, height: fitSize.value.height * zoom.value }));
  let observer: ResizeObserver | undefined;
  let drag: { id: number; x: number; y: number; panX: number; panY: number } | null = null;
  function clampPan() {
    const x = Math.max(0, (stageSize.value.width - fitSize.value.width) / 2), y = Math.max(0, (stageSize.value.height - fitSize.value.height) / 2);
    pan.value = { x: Math.max(-x, Math.min(x, pan.value.x)), y: Math.max(-y, Math.min(y, pan.value.y)) };
  }
  function fitStage() {
    const bounds = stageWrap.value?.getBoundingClientRect();
    if (!bounds) return;
    const width = Math.max(0, Math.min(bounds.width - 56, (bounds.height - 56) * ratio.value));
    fitSize.value = { width, height: width / ratio.value }; clampPan();
  }
  function setZoom(value: number, anchor?: { x: number; y: number }) {
    if (!Number.isFinite(value)) return;
    const next = Math.max(.25, Math.min(8, value)), factor = next / zoom.value;
    const bounds = stage.value?.getBoundingClientRect();
    const dx = anchor && bounds ? anchor.x - (bounds.left + bounds.width / 2) : -pan.value.x;
    const dy = anchor && bounds ? anchor.y - (bounds.top + bounds.height / 2) : -pan.value.y;
    pan.value = { x: pan.value.x - dx * (factor - 1), y: pan.value.y - dy * (factor - 1) };
    zoom.value = next; clampPan();
  }
  function resetZoom() { zoom.value = 1; pan.value = { x: 0, y: 0 }; }
  function wheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault(); setZoom(zoom.value * Math.exp(-event.deltaY * .01), { x: event.clientX, y: event.clientY });
    } else if (zoom.value > 1) {
      event.preventDefault(); pan.value = { x: pan.value.x - event.deltaX, y: pan.value.y - event.deltaY }; clampPan();
    }
  }
  function beginPan(event: PointerEvent) {
    if (event.button !== 1 && !(event.button === 0 && panMode.value)) return;
    event.preventDefault(); event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.value.x, panY: pan.value.y }; panning.value = true;
  }
  function movePan(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    pan.value = { x: drag.panX + event.clientX - drag.x, y: drag.panY + event.clientY - drag.y }; clampPan();
  }
  function endPan(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return;
    event.stopPropagation(); drag = null; panning.value = false;
    const element = event.currentTarget as HTMLElement;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
  }
  watch(ratio, fitStage);
  onMounted(() => { observer = new ResizeObserver(fitStage); if (stageWrap.value) observer.observe(stageWrap.value); fitStage(); });
  onBeforeUnmount(() => observer?.disconnect());
  return { stage, stageWrap, stageSize, zoom, pan, panMode, panning, setZoom, resetZoom, wheel, beginPan, movePan, endPan };
}
export type CanvasViewport = ReturnType<typeof useCanvasViewport>;
