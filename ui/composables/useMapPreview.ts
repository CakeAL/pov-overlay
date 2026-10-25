import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Sample, Widget } from '../domain/types';
import type { OverlayContext } from '../domain/overlayContext';
import { prepareMapRender } from '../infrastructure/renderWidget';
import { svgDataUrl } from '../domain/widgetSvg';
import { isAborted } from '../infrastructure/maps/requestCache';
import { mapRuntimeSettings } from '../infrastructure/maps/runtime';
import { retryAmap } from '../infrastructure/maps/amap';
import { retryMapTiles } from '../infrastructure/maps/tiles';
export interface MapPreviewInput { widget: Widget; sample: Sample | null; context: OverlayContext }
export function useMapPreview(input: () => MapPreviewInput, enabled = () => true) {
  const url = ref(''), error = ref(''), loading = ref(false), retry = ref(0);
  let plan: ReturnType<typeof prepareMapRender> | undefined, resourceKey = '', renderKey = '', revision = 0;
  let controller: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined, running = false;
  function stop() { revision++; clearTimeout(timer); controller?.abort(); running = false; }
  async function run(current: number) {
    if (current !== revision || !plan || !controller) return;
    running = true; loading.value = true;
    try {
      let snapshot;
      do {
        snapshot = plan;
        const source = await snapshot.render(controller.signal);
        if (current !== revision) return;
        if (snapshot === plan) { url.value = svgDataUrl(source); error.value = ''; }
      } while (snapshot !== plan);
    } catch (reason) { if (current === revision && !isAborted(reason)) error.value = reason instanceof Error ? reason.message : String(reason); }
    finally { if (current === revision) { running = false; loading.value = false; } }
  }
  watch(() => {
    if (!enabled()) return null;
    const value = input();
    const widget = { ...value.widget, map: { ...value.widget.map }, typography: value.widget.typography ? { ...value.widget.typography } : undefined };
    return { next: prepareMapRender(widget, value.sample, value.context), retry: retry.value };
  }, (value, previous) => {
    if (!value) { stop(); loading.value = false; renderKey = ''; return; }
    const { next } = value;
    if (next.renderKey === renderKey && previous?.retry === retry.value) return;
    const changedResources = resourceKey !== next.resourceKey || previous?.retry !== retry.value;
    plan = next; renderKey = next.renderKey;
    if (changedResources || !controller || controller.signal.aborted) {
      stop(); resourceKey = next.resourceKey; controller = new AbortController(); loading.value = true;
      const current = revision;
      timer = setTimeout(() => void run(current), next.ready ? 0 : mapRuntimeSettings().mapDebounceMs);
    } else if (!running && !loading.value) void run(revision);
  }, { immediate: true });
  function refresh() { retryMapTiles(); retryAmap(); retry.value++; }
  onMounted(() => { for (const name of ['pov-map-settings-changed', 'pov-map-cache-cleared']) window.addEventListener(name, refresh); });
  onBeforeUnmount(() => { stop(); for (const name of ['pov-map-settings-changed', 'pov-map-cache-cleared']) window.removeEventListener(name, refresh); });
  return { url, error, loading, refresh };
}
