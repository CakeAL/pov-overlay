<script setup lang="ts">
import { toRefs } from 'vue';
import { useEditorContext } from '../../editor/context';
const { layout } = useEditorContext();
const { selected } = toRefs(layout);
function change(key: 'zoom' | 'shape' | 'headingUp' | 'showRoute', value: number | string | boolean) {
  if (!selected.value || selected.value.locked) return;
  layout.remember(); selected.value.map = { ...selected.value.map, [key]: value };
}
</script>
<template>
  <div v-if="selected?.kind === 'minimap'">
    <label class="setting-row">地图缩放<input aria-label="地图缩放" type="number" min="2" max="19" :disabled="selected.locked" :value="selected.map?.zoom ?? 14" @change="change('zoom', Math.round(Math.max(2, Math.min(19, Number(($event.target as HTMLInputElement).value) || 14))))" /></label>
    <label class="setting-row">形状<select aria-label="地图形状" :disabled="selected.locked" :value="selected.map?.shape ?? 'circle'" @change="change('shape', ($event.target as HTMLSelectElement).value)"><option value="circle">圆形</option><option value="square">方形</option></select></label>
    <label class="setting-row">航向朝上<input type="checkbox" :disabled="selected.locked" :checked="selected.map?.headingUp" @change="change('headingUp', ($event.target as HTMLInputElement).checked)" /></label>
    <label class="setting-row">显示路线<input type="checkbox" :disabled="selected.locked" :checked="selected.map?.showRoute !== false" @change="change('showRoute', ($event.target as HTMLInputElement).checked)" /></label>
  </div>
</template>
