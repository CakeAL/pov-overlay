<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { MAX_TEXT_LENGTH, TEXT_FIELDS } from '../../domain/textOverlay';
import { useEditorContext } from '../../editor/context';
const { layout, svgElements } = useEditorContext();
const input = ref<HTMLTextAreaElement>();
async function insertField(event: Event) {
  const select = event.target as HTMLSelectElement;
  const field = select.value;
  select.value = '';
  const widget = layout.selected;
  if (!field || widget?.svg?.textTemplate == null || widget.locked) return;
  const template = widget.svg.textTemplate;
  const start = input.value?.selectionStart ?? template.length;
  const end = input.value?.selectionEnd ?? start;
  const token = `{$${field}}`;
  if (!svgElements.updateText(template.slice(0, start) + token + template.slice(end))) return;
  await nextTick();
  input.value?.focus();
  input.value?.setSelectionRange(start + token.length, start + token.length);
}
</script>
<template>
  <div v-if="layout.selected?.svg?.textTemplate != null" :key="layout.selected.id" class="text-properties">
    <label for="overlay-text">文本内容</label>
    <textarea id="overlay-text" ref="input" aria-label="文本内容" rows="4" :maxlength="MAX_TEXT_LENGTH" :disabled="layout.selected.locked" :value="layout.selected.svg.textTemplate" spellcheck="false" @change="svgElements.updateText(($event.target as HTMLTextAreaElement).value)" />
    <select aria-label="插入文本参数" :disabled="layout.selected.locked" value="" @change="insertField"><option value="" disabled>插入参数</option><option v-for="item in TEXT_FIELDS" :key="item.field" :value="item.field">{{ item.label }} · {{ '{$' + item.field + '}' }}</option></select>
  </div>
</template>
