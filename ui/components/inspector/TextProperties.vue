<script setup lang="ts">
import { computed, nextTick, ref, type ComponentPublicInstance } from "vue";
import HNumberInput from "@celestia-island/hikari/components/HkNumberInput.tsx";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import HInput from "@celestia-island/hikari/components/HkInput.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import { MAX_TEXT_LENGTH, TEXT_FIELDS } from "../../domain/textOverlay";
import { useEditorContext } from "../../editor/context";
const { layout, svgElements } = useEditorContext();
const input = ref<ComponentPublicInstance>();
const lines = computed(
  () =>
    layout.selected?.svg?.textTemplate?.replace(/\r\n?/g, "\n").split("\n") ??
    [],
);
const options = TEXT_FIELDS.map((item) => ({
  value: item.field,
  label: `${item.label} · {$${item.field}}`,
}));
async function insertField(field: string) {
  const widget = layout.selected;
  if (!field || widget?.svg?.textTemplate == null || widget.locked) return;
  const textarea = input.value?.$el.querySelector("textarea") as
    | HTMLTextAreaElement
    | undefined;
  const template = widget.svg.textTemplate;
  const start = textarea?.selectionStart ?? template.length;
  const end = textarea?.selectionEnd ?? start;
  const token = `{$${field}}`;
  if (
    !svgElements.updateText(
      template.slice(0, start) + token + template.slice(end),
    )
  )
    return;
  await nextTick();
  textarea?.focus();
  textarea?.setSelectionRange(start + token.length, start + token.length);
}
</script>
<template>
  <div
    v-if="layout.selected?.svg?.textTemplate != null"
    :key="layout.selected.id"
    class="text-properties"
  >
    <HInput
      id="overlay-text"
      ref="input"
      type="textarea"
      label="文本内容"
      :rows="4"
      :maxlength="MAX_TEXT_LENGTH"
      :disabled="layout.selected.locked"
      :model-value="layout.selected.svg.textTemplate"
      :spellcheck="false"
      @change="
        svgElements.updateText(($event.target as HTMLTextAreaElement).value)
      "
    />
    <HSelect
      panel-title="插入文本参数"
      placeholder="插入参数"
      :disabled="layout.selected.locked"
      model-value=""
      :options="options"
      @update:model-value="insertField"
    />
    <label v-for="(_, index) in lines" :key="index" class="setting-row">
      第 {{ index + 1 }} 行字号
      <HNumberInput
        :aria-label="`第 ${index + 1} 行字号`"
        :min="8"
        :max="200"
        :disabled="layout.selected.locked"
        :model-value="
          layout.selected.svg.lineFontSizes?.[index] ??
          layout.selected.typography?.fontSize ??
          32
        "
        @update:model-value="
          svgElements.updateTextLineSize(index, Number($event))
        "
      />
      <HButton
        variant="ghost"
        size="sm"
        :disabled="
          layout.selected.locked ||
          layout.selected.svg.lineFontSizes?.[index] == null
        "
        @click="svgElements.updateTextLineSize(index, null)"
        >自动</HButton
      >
    </label>
  </div>
</template>
