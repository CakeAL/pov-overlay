<script setup lang="ts">
import { nextTick, ref, type ComponentPublicInstance } from 'vue';
import HInput from '@celestia-island/hikari/components/HkInput.tsx';
import HSelect from '@celestia-island/hikari/components/HkSelect.tsx';
import { MAX_TEXT_LENGTH, TEXT_FIELDS } from '../../domain/textOverlay';
import { useEditorContext } from '../../editor/context';
const { layout, svgElements } = useEditorContext();
const input = ref<ComponentPublicInstance>();
const options = TEXT_FIELDS.map(item => ({ value: item.field, label: `${item.label} · {$${item.field}}` }));
async function insertField(field: string) {
  const widget = layout.selected;
  if (!field || widget?.svg?.textTemplate == null || widget.locked) return;
  const textarea = input.value?.$el.querySelector('textarea') as HTMLTextAreaElement | undefined;
  const template = widget.svg.textTemplate;
  const start = textarea?.selectionStart ?? template.length;
  const end = textarea?.selectionEnd ?? start;
  const token = `{$${field}}`;
  if (!svgElements.updateText(template.slice(0, start) + token + template.slice(end))) return;
  await nextTick();
  textarea?.focus();
  textarea?.setSelectionRange(start + token.length, start + token.length);
}
</script>
<template>
  <div v-if="layout.selected?.svg?.textTemplate != null" :key="layout.selected.id" class="text-properties">
    <HInput id="overlay-text" ref="input" type="textarea" label="文本内容" :rows="4" :maxlength="MAX_TEXT_LENGTH" :disabled="layout.selected.locked" :model-value="layout.selected.svg.textTemplate" :spellcheck="false" @change="svgElements.updateText(($event.target as HTMLTextAreaElement).value)" />
    <HSelect panel-title="插入文本参数" placeholder="插入参数" :disabled="layout.selected.locked" model-value="" :options="options" @update:model-value="insertField" />
  </div>
</template>
