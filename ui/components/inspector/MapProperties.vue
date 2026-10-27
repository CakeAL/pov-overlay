<script setup lang="ts">
import HNumberInput from "@celestia-island/hikari/components/HkNumberInput.tsx";
import HSlider from "@celestia-island/hikari/components/HkSlider.tsx";
import HCheckbox from "@celestia-island/hikari/components/HkCheckbox.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
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
    <label class="setting-row">地图来源<HSelect panel-title="地图来源" :disabled="selected.locked" :model-value="selected.map?.provider ?? 'osm'" :options="MAP_PROVIDERS.map(provider => ({ value: provider.value, label: provider.label }))" @update:model-value="change('provider', $event)" /></label>
    <div class="preferences-row"><HButton variant="ghost" size="sm" class="text-button" @click="appSettings.openUrl(source.url)">{{ source.label }} ↗</HButton><HButton variant="ghost" size="sm" class="text-button" @click="appSettings.open">API 设置</HButton></div>
    <label class="slider-label map-opacity-label" for="minimap-opacity">地图不透明度<span>{{ selected.map?.opacity ?? 100 }}%</span></label>
    <HSlider id="minimap-opacity" class="property-slider" aria-label="地图不透明度" :min="0" :max="100" :step="1" :disabled="selected.locked" :model-value="selected.map?.opacity ?? 100" @pointerdown.capture="layout.remember" @keydown.capture="layout.remember" @update:model-value="change('opacity', $event, false)" />
    <label class="setting-row">地图缩放<HNumberInput aria-label="地图缩放" :min="2" :max="selected.map?.provider === 'amap' ? 17 : 19" :disabled="selected.locked" :model-value="selected.map?.zoom ?? 14" @update:model-value="change('zoom', Math.round(Math.max(2, Math.min(selected.map?.provider === 'amap' ? 17 : 19, Number($event) || 14))))" /></label>
    <label class="setting-row">形状<HSelect panel-title="地图形状" :disabled="selected.locked" :model-value="selected.map?.shape ?? 'circle'" :options="[{ value: 'circle', label: '圆形' }, { value: 'square', label: '方形' }]" @update:model-value="change('shape', $event)" /></label>
    <HCheckbox label="航向朝上" :disabled="selected.locked" :model-value="selected.map?.headingUp" @update:model-value="change('headingUp', $event)" />
    <HCheckbox label="显示路线" :disabled="selected.locked" :model-value="selected.map?.showRoute !== false" @update:model-value="change('showRoute', $event)" />
  </div>
</template>
