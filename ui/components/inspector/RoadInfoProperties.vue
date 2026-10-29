<script setup lang="ts">
import { computed } from "vue";
import HInput from "@celestia-island/hikari/components/HkInput.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import HCheckbox from "@celestia-island/hikari/components/HkCheckbox.tsx";
import { useEditorContext } from "../../editor/context";
import {
  roadIdentity,
  roadCodeType,
  validRoadType,
  type RoadInfoOptions,
} from "../../domain/roadIdentity";
const { layout, locationLabels } = useEditorContext();
const widget = computed(() =>
  layout.selected?.svg?.roadInfo ? layout.selected : null,
);
const types = [
  { value: "", label: "自动判断" },
  { value: "nationalExpressway", label: "国家高速" },
  { value: "provincialExpressway", label: "省高速" },
  { value: "national", label: "国道" },
  { value: "provincial", label: "省道" },
  { value: "county", label: "县道" },
  { value: "township", label: "乡道" },
];
function change(
  key: keyof RoadInfoOptions,
  value: string | boolean,
  remember = true,
) {
  if (!widget.value?.svg || widget.value.locked) return;
  if (remember) layout.remember();
  widget.value.svg.roadInfo = {
    ...widget.value.svg.roadInfo,
    [key]:
      key === "typeOverride" && !value
        ? undefined
        : key === "numberOverride"
          ? String(value).trim().toUpperCase()
          : value,
  };
}
const invalid = computed(() => {
  const r = widget.value?.svg?.roadInfo,
    code = r?.numberOverride;
  if (!code) return "";
  return !roadCodeType(code) ||
    (r.typeOverride && !validRoadType(code, r.typeOverride))
    ? "请填写有效编号，如 G15、G104、S12；编号须与类型一致。"
    : "";
});
const current = computed(() =>
  widget.value
    ? roadIdentity(locationLabels.address, widget.value.svg?.roadInfo)
    : null,
);
</script>
<template>
  <div v-if="widget" class="road-info-properties">
    <label class="setting-row"
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
      label="显示可用英文"
      :disabled="widget.locked"
      :model-value="widget.svg!.roadInfo?.showEnglish !== false"
      @update:model-value="change('showEnglish', $event)"
    />
    <HInput
      label="手动道路编号（可选）"
      placeholder="留空自动识别，例如 G15"
      :disabled="widget.locked"
      :model-value="widget.svg!.roadInfo?.numberOverride ?? ''"
      :maxlength="5"
      @focus.capture="layout.remember"
      @update:model-value="change('numberOverride', String($event), false)"
    />
    <label class="setting-row"
      >道路类型<HSelect
        :disabled="widget.locked"
        :model-value="widget.svg!.roadInfo?.typeOverride ?? ''"
        :options="types"
        @update:model-value="change('typeOverride', String($event))"
    /></label>
    <p v-if="invalid" class="muted" role="status">{{ invalid }}</p>
    <p v-else class="muted" role="status">
      {{
        current ? `当前识别：${current.code}` : "没有可靠编号时只显示道路名称。"
      }}
    </p>
  </div>
</template>
