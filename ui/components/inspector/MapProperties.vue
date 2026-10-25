<script setup lang="ts">
import { computed, toRefs } from 'vue';
import { useEditorContext } from '../../editor/context';
import { MAP_PROVIDERS } from '../../domain/appSettings';
const { layout, appSettings } = useEditorContext();
const { selected } = toRefs(layout);
function change(key: 'opacity' | 'provider' | 'zoom' | 'shape' | 'headingUp' | 'showRoute', value: number | string | boolean, history = true) {
  if (!selected.value || selected.value.locked) return;
  if (history) layout.remember();
  selected.value.map = { ...selected.value.map, [key]: value };
  if (value === 'amap' && (selected.value.map.zoom ?? 14) > 17) selected.value.map.zoom = 17;
}
const source = computed(() => MAP_PROVIDERS.find(provider => provider.value === (selected.value?.map?.provider ?? 'osm'))!);
</script>
<template>
  <div v-if="selected?.kind === 'minimap'">
    <label class="setting-row">地图来源<select aria-label="地图来源" :disabled="selected.locked" :value="selected.map?.provider ?? 'osm'" @change="change('provider', ($event.target as HTMLSelectElement).value)"><option v-for="provider in MAP_PROVIDERS" :key="provider.value" :value="provider.value">{{ provider.label }}</option></select></label>
    <div class="preferences-row"><button class="text-button" @click="appSettings.openUrl(source.url)">{{ source.label }} ↗</button><button class="text-button" @click="appSettings.open">API 设置</button></div>
    <label class="slider-label map-opacity-label" for="minimap-opacity">地图不透明度<span>{{ selected.map?.opacity ?? 100 }}%</span></label>
    <input id="minimap-opacity" class="property-slider" aria-label="地图不透明度" type="range" min="0" max="100" step="1" :disabled="selected.locked" :value="selected.map?.opacity ?? 100" @pointerdown="layout.remember" @keydown="layout.remember" @input="change('opacity', Math.max(0, Math.min(100, Number(($event.target as HTMLInputElement).value))), false)" />
    <label class="setting-row">地图缩放<input aria-label="地图缩放" type="number" min="2" :max="selected.map?.provider === 'amap' ? 17 : 19" :disabled="selected.locked" :value="selected.map?.zoom ?? 14" @change="change('zoom', Math.round(Math.max(2, Math.min(selected.map?.provider === 'amap' ? 17 : 19, Number(($event.target as HTMLInputElement).value) || 14))))" /></label>
    <label class="setting-row">形状<select aria-label="地图形状" :disabled="selected.locked" :value="selected.map?.shape ?? 'circle'" @change="change('shape', ($event.target as HTMLSelectElement).value)"><option value="circle">圆形</option><option value="square">方形</option></select></label>
    <label class="setting-row">航向朝上<input type="checkbox" :disabled="selected.locked" :checked="selected.map?.headingUp" @change="change('headingUp', ($event.target as HTMLInputElement).checked)" /></label>
    <label class="setting-row">显示路线<input type="checkbox" :disabled="selected.locked" :checked="selected.map?.showRoute !== false" @change="change('showRoute', ($event.target as HTMLInputElement).checked)" /></label>
  </div>
</template>
