<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import type { Widget, Sample } from '../../domain/types';
import { useEditorContext } from '../../editor/context';
import { retryMapTiles } from "../../infrastructure/maps/tiles";
import { renderWidgetSvg } from '../../infrastructure/renderWidget';
import { svgDataUrl } from '../../domain/widgetSvg';
const props = defineProps<{ widget: Widget; sample: Sample | null }>();
const { playback, timeline } = useEditorContext();
const url = ref(''), error = ref(''), retry = ref(0);
let revision = 0;
watch(() => [JSON.stringify(props.widget), props.sample, timeline.context.timestampMs, timeline.context.track, retry.value], async () => {
  const current = ++revision;
  try {
    const svg = await renderWidgetSvg(props.widget, props.sample, playback.currentTime, playback.ratio, timeline.context);
    if (current === revision) { url.value = svgDataUrl(svg); error.value = ''; }
  } catch (reason) { if (current === revision) error.value = reason instanceof Error ? reason.message : String(reason); }
}, { immediate: true });
function configured() { retry.value++; }
onMounted(() => window.addEventListener('pov-amap-configured', configured));
onBeforeUnmount(() => { revision++; window.removeEventListener('pov-amap-configured', configured); });
</script>
<template>
  <img v-if="url && !error" class="builtin-readout" :src="url" alt="小地图" draggable="false" />
  <div v-else class="map-status"><span>{{ error ? '地图加载失败' : '加载地图…' }}</span><button v-if="error" :title="error" @pointerdown.stop @click.stop="retryMapTiles(); retry++">重试</button></div>
</template>
