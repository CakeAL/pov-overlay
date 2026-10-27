<script setup lang="ts">
import HNumberInput from "@celestia-island/hikari/components/HkNumberInput.tsx";
import HCheckbox from "@celestia-island/hikari/components/HkCheckbox.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
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
    <label class="setting-row">路线范围<HSelect panel-title="路线范围" :disabled="selected.locked" :model-value="selected.route?.mode ?? 'full'" :options="[{ value: 'full', label: '全程' }, { value: 'local', label: '局部' }]" @update:model-value="change('mode', $event)" /></label>
    <label v-if="selected.route?.mode === 'local'" class="setting-row">前后时长（秒）<HNumberInput aria-label="局部路线时长" :min="10" :max="7200" :disabled="selected.locked" :model-value="selected.route?.windowSeconds ?? 120" @update:model-value="change('windowSeconds', Math.max(10, Math.min(7200, Number($event) || 120)))" /></label>
    <HCheckbox label="航向朝上" :disabled="selected.locked" :model-value="selected.route?.headingUp" @update:model-value="change('headingUp', $event)" />
  </div>
</template>
