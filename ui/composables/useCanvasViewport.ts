import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";

export function useCanvasViewport(ratio: Ref<number>) {
  const stage = ref<HTMLElement>(),
    stageWrap = ref<HTMLElement>();
  const stageSize = ref({ width: 960, height: 540 });
  let observer: ResizeObserver | undefined;
  function fitStage() {
    const bounds = stageWrap.value?.getBoundingClientRect();
    if (!bounds) return;
    const width = Math.max(
      0,
      Math.min(bounds.width - 56, (bounds.height - 56) * ratio.value),
    );
    stageSize.value = { width, height: width / ratio.value };
  }

  watch(ratio, fitStage);
  onMounted(() => {
    observer = new ResizeObserver(fitStage);
    if (stageWrap.value) observer.observe(stageWrap.value);
    fitStage();
  });
  onBeforeUnmount(() => observer?.disconnect());
  return { stage, stageWrap, stageSize };
}
export type CanvasViewport = ReturnType<typeof useCanvasViewport>;
