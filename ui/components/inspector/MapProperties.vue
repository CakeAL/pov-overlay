<script setup lang="ts">
import { ref, toRefs, watch } from 'vue';
import { useEditorContext } from '../../editor/context';
import { amapKeyStatus, configureAmap } from '../../infrastructure/maps/amap';
const { layout, messages } = useEditorContext();
const { selected } = toRefs(layout);
function change(key: 'opacity' | 'provider' | 'zoom' | 'shape' | 'headingUp' | 'showRoute', value: number | string | boolean, history = true) {
  if (!selected.value || selected.value.locked) return;
  if (history) layout.remember();
  selected.value.map = { ...selected.value.map, [key]: value };
  if (value === 'amap' && (selected.value.map.zoom ?? 14) > 17) selected.value.map.zoom = 17;
}
const key = ref(''), configured = ref(false), saving = ref(false);
watch(() => selected.value?.map?.provider, async provider => { if (provider === 'amap') try { configured.value = await amapKeyStatus(); } catch (reason) { messages.report(reason); } }, { immediate: true });
async function saveKey() {
  saving.value = true;
  try { await configureAmap(key.value.trim()); configured.value = true; key.value = ''; messages.notice = '高德地图 Key 已保存。'; }
  catch (reason) { messages.report(reason); }
  finally { saving.value = false; }
}
</script>
<template>
  <div v-if="selected?.kind === 'minimap'">
    <label class="setting-row">地图来源<select aria-label="地图来源" :disabled="selected.locked" :value="selected.map?.provider ?? 'osm'" @change="change('provider', ($event.target as HTMLSelectElement).value)"><option value="osm">OpenStreetMap</option><option value="amap">高德地图</option></select></label>
    <div v-if="selected.map?.provider === 'amap'" class="amap-key-setting"><input aria-label="高德 Web 服务 Key" type="password" autocomplete="off" v-model="key" :placeholder="configured ? '已配置，可输入新 Key' : 'Web 服务 Key'" /><button :disabled="saving || !key.trim()" @click="saveKey">应用</button></div>
    <label class="slider-label map-opacity-label" for="minimap-opacity">地图不透明度<span>{{ selected.map?.opacity ?? 100 }}%</span></label>
    <input id="minimap-opacity" class="property-slider" aria-label="地图不透明度" type="range" min="0" max="100" step="1" :disabled="selected.locked" :value="selected.map?.opacity ?? 100" @pointerdown="layout.remember" @keydown="layout.remember" @input="change('opacity', Math.max(0, Math.min(100, Number(($event.target as HTMLInputElement).value))), false)" />
    <label class="setting-row">地图缩放<input aria-label="地图缩放" type="number" min="2" :max="selected.map?.provider === 'amap' ? 17 : 19" :disabled="selected.locked" :value="selected.map?.zoom ?? 14" @change="change('zoom', Math.round(Math.max(2, Math.min(selected.map?.provider === 'amap' ? 17 : 19, Number(($event.target as HTMLInputElement).value) || 14))))" /></label>
    <label class="setting-row">形状<select aria-label="地图形状" :disabled="selected.locked" :value="selected.map?.shape ?? 'circle'" @change="change('shape', ($event.target as HTMLSelectElement).value)"><option value="circle">圆形</option><option value="square">方形</option></select></label>
    <label class="setting-row">航向朝上<input type="checkbox" :disabled="selected.locked" :checked="selected.map?.headingUp" @change="change('headingUp', ($event.target as HTMLInputElement).checked)" /></label>
    <label class="setting-row">显示路线<input type="checkbox" :disabled="selected.locked" :checked="selected.map?.showRoute !== false" @change="change('showRoute', ($event.target as HTMLInputElement).checked)" /></label>
  </div>
</template>
