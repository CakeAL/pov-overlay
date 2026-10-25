<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { MapPin, Route } from 'lucide-vue-next';
import { useEditorContext } from '../../editor/context';
import { renderWidgetSvg } from '../../infrastructure/renderWidget';
import { widgetSvg, svgDataUrl } from '../../domain/widgetSvg';
import { overlayContext } from '../../domain/overlayContext';
import type { Widget } from '../../domain/types';
const { timeline, svgElements } = useEditorContext();
const map = ref(''), error = ref('');
const template = (kind: 'route' | 'minimap'): Widget => ({ id: 'thumbnail', kind, label: '', x: 0, y: 0, scale: 1, opacity: 0, color: '#c7f284', visible: true, locked: false, map: { shape: 'circle', zoom: 14 }, route: { mode: 'full' } });
const route = computed(() => {
  const track = timeline.preparedTrack;
  if (!track) return '';
  const sample = track.samples[0]!;
  return svgDataUrl(widgetSvg(template('route'), sample, 0, 1, overlayContext(track, track.startMs, sample)));
});
let revision = 0;
watch(() => timeline.preparedTrack, async track => {
  const current = ++revision; map.value = ''; error.value = '';
  if (!track) return;
  try {
    const sample = track.samples[0]!;
    const source = await renderWidgetSvg(template('minimap'), sample, 0, 1, overlayContext(track, track.startMs, sample));
    if (current === revision) map.value = svgDataUrl(source);
  } catch (reason) { if (current === revision) error.value = String(reason); }
}, { immediate: true });
onBeforeUnmount(() => revision++);
</script>
<template>
  <div class="catalog-grid navigation-catalog">
    <button @click="svgElements.addRoute"><span class="catalog-preview"><img v-if="route" :src="route" alt="当前 GPX 路线缩略图" /><Route v-else :size="30" /></span><span>路线</span></button>
    <button @click="svgElements.addMinimap"><span class="catalog-preview" :title="error || '当前 GPX 起点附近地图'"><img v-if="map" :src="map" alt="当前 GPX 小地图缩略图" /><MapPin v-else :size="30" /></span><span>小地图</span></button>
  </div>
</template>
