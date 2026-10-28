import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { hasLocationFields, locationKey, locationQuery, type LocationAddress, type LocationQuery } from '../domain/location';
import { lookupLocation, retryLocation } from '../infrastructure/maps/geocoding';
import { isAborted } from '../infrastructure/maps/requestCache';
import { mapRuntimeSettings } from '../infrastructure/maps/runtime';
import type { Timeline } from './useTimeline';
import type { WidgetLayout } from './useWidgetLayout';
import type { EditorMessages } from './useMessages';
export function useLocationLabels(timeline: Timeline, layout: WidgetLayout, paused: () => boolean, messages: EditorMessages) {
  const address = ref<LocationAddress | null>(null), loading = ref(false), error = ref(''), retryCount = ref(0);
  const enabled = computed(() => !paused() && layout.widgets.value.some(widget => widget.visible && widget.scale > 0 && hasLocationFields(widget)));
  const query = computed(() => {
    retryCount.value;
    return enabled.value ? locationQuery(timeline.sample.value, timeline.context.value, mapRuntimeSettings().locationRefreshSeconds) : null;
  });
  let request: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined, revision = 0, previous: LocationQuery | undefined;
  watch([() => query.value ? locationKey(query.value) : '', retryCount], () => {
    const current = ++revision;
    request?.abort(); clearTimeout(timer);
    const point = query.value;
    if (!point) { address.value = null; loading.value = false; error.value = ''; return; }
    if (!previous || Math.hypot((previous.latitude - point.latitude) * 111320, (previous.longitude - point.longitude) * 111320 * Math.cos(point.latitude*Math.PI/180)) > 100) address.value = null;
    request = new AbortController();
    const signal = request.signal;
    loading.value = true;
    timer = setTimeout(async () => {
      try {
        const value = await lookupLocation(point, signal);
        if (current === revision) { address.value = value; previous = point; error.value = ''; }
      } catch (reason) {
        if (current === revision && !isAborted(reason)) {
          const text = reason instanceof Error ? reason.message : String(reason);
          if (text !== error.value) messages.report(reason);
          error.value = text;
        }
      } finally { if (current === revision) loading.value = false; }
    }, mapRuntimeSettings().mapDebounceMs);
  }, { immediate: true });
  function refresh() { retryLocation(); retryCount.value++; }
  onMounted(() => window.addEventListener('pov-map-settings-changed', refresh));
  onBeforeUnmount(() => { revision++; request?.abort(); clearTimeout(timer); window.removeEventListener('pov-map-settings-changed', refresh); });
  return { address, loading, error, refresh };
}
