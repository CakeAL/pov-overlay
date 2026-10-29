<script setup lang="ts">
import { computed } from "vue";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import RoadTableDialog from "./RoadTableDialog.vue";
import HNumberInput from "@celestia-island/hikari/components/HkNumberInput.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import HCheckbox from "@celestia-island/hikari/components/HkCheckbox.tsx";
import { useEditorContext } from "../../editor/context";
import type { RoadInfoOptions } from "../../domain/roadIdentity";
const { layout, roadTable, svgElements } = useEditorContext();
const widget = computed(() =>
  layout.selected?.svg?.roadInfo ? layout.selected : null,
);
function change(
  key: keyof RoadInfoOptions,
  value: string | boolean | number,
  remember = true,
) {
  if (!widget.value?.svg || widget.value.locked) return;
  if (remember) layout.remember();
  widget.value.svg.roadInfo = {
    ...widget.value.svg.roadInfo,
    [key]: value,
  };
  layout.clampWidget(widget.value);
}
</script>
<template>
  <div v-if="widget" class="road-info-properties">
    <label v-if="!widget.svg!.roadInfo?.mode" class="setting-row"
      >编号牌位置<HSelect
        :disabled="widget.locked"
        :model-value="widget.svg!.roadInfo?.badgePosition ?? 'before'"
        :options="[
          { value: 'before', label: '名称前' },
          { value: 'after', label: '名称后' },
        ]"
        @update:model-value="change('badgePosition', String($event))"
    /></label>
    <HCheckbox
      v-if="widget.svg!.roadInfo?.mode !== 'badge'"
      label="显示可用英文"
      :disabled="widget.locked"
      :model-value="widget.svg!.roadInfo?.showEnglish !== false"
      @update:model-value="change('showEnglish', $event)"
    />
    <HButton :disabled="widget.locked" @click="roadTable.open"
      >道路编号表</HButton
    >
    <RoadTableDialog />
  </div>
</template>
