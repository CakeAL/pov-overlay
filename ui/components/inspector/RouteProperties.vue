<script setup lang="ts">
import { toRefs } from 'vue';
import { useEditorContext } from '../../editor/context';
const { layout } = useEditorContext();
const { selected } = toRefs(layout);
function change(key: 'mode' | 'windowSeconds' | 'headingUp', value: string | number | boolean) {
  if (!selected.value || selected.value.locked) return;
  layout.remember();
  selected.value.route = { ...selected.value.route, [key]: value };
}
</script>
<template>
  <div v-if="selected?.kind === 'route'">
    <label class="setting-row">路线范围<select aria-label="路线范围" :disabled="selected.locked" :value="selected.route?.mode ?? 'full'" @change="change('mode', ($event.target as HTMLSelectElement).value)"><option value="full">全程</option><option value="local">局部</option></select></label>
    <label v-if="selected.route?.mode === 'local'" class="setting-row">前后时长（秒）<input aria-label="局部路线时长" type="number" min="10" max="7200" :disabled="selected.locked" :value="selected.route?.windowSeconds ?? 120" @change="change('windowSeconds', Math.max(10, Math.min(7200, Number(($event.target as HTMLInputElement).value) || 120)))" /></label>
    <label class="setting-row">航向朝上<input aria-label="路线航向朝上" type="checkbox" :disabled="selected.locked" :checked="selected.route?.headingUp" @change="change('headingUp', ($event.target as HTMLInputElement).checked)" /></label>
  </div>
</template>
