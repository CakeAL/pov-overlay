<script setup lang="ts">
import { computed } from "vue";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import HNumberInput from "@celestia-island/hikari/components/HkNumberInput.tsx";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { useEditorContext } from "../../editor/context";
const { signMaker: maker } = useEditorContext();
const editing = maker.textEditing;
const options = computed(
  () =>
    maker.artwork?.texts.map((item) => {
      const i =
        maker.design?.destinations.findIndex((row, index) =>
          item.key.startsWith(`destination.${row.id ?? index}.`),
        ) ?? -1;
      return {
        value: item.key,
        label:
          i >= 0
            ? `第 ${i + 1} 行 · ${item.label}`
            : item.key === "junction.cardinal"
              ? `方位 · ${item.label}`
              : item.label,
      };
    }) ?? [],
);
const changed = computed(
  () => !!maker.design?.textEdits?.[editing.selectedKey],
);
const hasEdits = computed(
  () => Object.keys(maker.design?.textEdits ?? {}).length > 0,
);
const rounded = (value: number) => Math.round(value * 10) / 10;
</script>
<template>
  <section
    v-if="options.length"
    class="sign-text-controls"
    aria-label="文字排版"
  >
    <h2>文字排版</h2>
    <HSelect
      aria-label="选择标牌文字"
      placeholder="选择文字，也可点击预览中的文字"
      :options="options"
      :model-value="editing.selectedKey"
      @update:model-value="editing.select(String($event))"
    />
    <template v-if="editing.position">
      <div class="sign-text-coordinates">
        <label
          >文字 X（px）<HNumberInput
            :model-value="rounded(editing.position.x)"
            :min="0"
            :max="maker.preview?.width"
            :step="1"
            @update:model-value="editing.update('x', $event)"
        /></label>
        <label
          >文字 Y（px）<HNumberInput
            :model-value="rounded(editing.position.y)"
            :min="0"
            :max="maker.preview?.height"
            :step="1"
            @update:model-value="editing.update('y', $event)"
        /></label>
      </div>
      <label
        >字高（px）<HNumberInput
          :model-value="rounded(editing.position.height)"
          :min="1"
          :max="maker.preview?.height"
          :step="1"
          @update:model-value="editing.update('height', $event)"
      /></label>
    </template>
    <div class="sign-text-reset">
      <HButton
        variant="ghost"
        size="sm"
        :disabled="!changed"
        @click="editing.reset()"
        >还原当前文字</HButton
      >
      <HButton
        variant="ghost"
        size="sm"
        :disabled="!hasEdits"
        @click="editing.reset(true)"
        >还原全部文字</HButton
      >
    </div>
  </section>
</template>
