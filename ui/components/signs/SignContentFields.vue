<script setup lang="ts">
import HInput from "@celestia-island/hikari/components/HkInput.tsx";
import HNumberInput from "@celestia-island/hikari/components/HkNumberInput.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import HSwitch from "@celestia-island/hikari/components/HkSwitch.tsx";
import SignDestinationFields from "./SignDestinationFields.vue";
import { computed } from "vue";
import {
  DIRECTIONS,
  emptyDestination,
  isExpressway,
  isRouteNumber,
  SIGN_TEMPLATES,
  type SignDesign,
} from "../../domain/signs/model";
const props = defineProps<{ design: SignDesign }>();
const d = computed(() => props.design),
  route = computed(() => isRouteNumber(d.value.template)),
  express = computed(() => isExpressway(d.value.template));
const rows = computed(
  () =>
    !route.value && !["roadName", "urbanExpressway"].includes(d.value.template),
);
const rowLimit = computed(() =>
  d.value.template === "free"
    ? 6
    : d.value.template === "roundabout"
      ? 5
      : ["interchange", "fork", "tJunction", "wideTJunction"].includes(
            d.value.template,
          )
        ? 2
        : 3,
);
function addRow() {
  const row = emptyDestination();
  row.direction = ["interchange", "fork"].includes(d.value.template)
    ? "right"
    : (((["tJunction", "wideTJunction"].includes(d.value.template)
        ? ["straight", "right"]
        : DIRECTIONS.map((x) => x.value)
      ).find(
        (value) => !d.value.destinations.some((r) => r.direction === value),
      ) as typeof row.direction) ?? "straight");
  d.value.destinations.push(row);
}
</script>
<template>
  <h2>{{ SIGN_TEMPLATES.find((t) => t.value === d.template)?.label }}设置</h2>
  <template v-if="route"
    ><HInput
      label="道路编号数字"
      v-model="d.code"
      :maxlength="express ? 4 : 3"
      placeholder="只填数字，前缀自动生成" /><HInput
      v-if="d.template === 'provincialExpressway'"
      label="省份简称"
      v-model="d.province"
      :maxlength="1"
  /></template>
  <template
    v-if="
      express || d.template === 'roadName' || d.template === 'urbanExpressway'
    "
    ><HInput
      :label="express ? '高速名称（可选）' : '道路名称'"
      v-model="d.roadName"
      :maxlength="20" /><HInput
      v-if="!express"
      label="英文 / 拼音（可选）"
      v-model="d.english"
      :maxlength="80"
  /></template>
  <template v-if="d.template === 'exit' || d.template === 'entrance'"
    ><HInput label="出入口编号" v-model="d.exitNumber" :maxlength="8" /><HInput
      label="预告距离（可选）"
      v-model="d.exitDistance"
      :maxlength="12"
      placeholder="例如 500 m"
  /></template>
  <label
    v-if="
      rows && !['interchange', 'fork', 'exit', 'entrance'].includes(d.template)
    "
    class="sign-maker-toggle"
    >高速公路绿底<HSwitch v-model="d.green" aria-label="高速公路绿底"
  /></label>
  <label
    v-if="
      ['crossroads', 'wideTJunction', 'dividedJunction'].includes(d.template)
    "
    >方位角标<HSelect
      v-model="d.cardinal"
      :options="[
        { value: '', label: '无' },
        ...['东', '南', '西', '北'].map((value) => ({ value, label: value })),
      ]"
  /></label>
  <label v-if="d.cardinal"
    >角标位置<HSelect
      :model-value="d.cardinalSide ?? 'left'"
      :options="[
        { value: 'left', label: '左上' },
        { value: 'right', label: '右上' },
      ]"
      @update:model-value="d.cardinalSide = $event as 'left' | 'right'"
  /></label>
  <HInput
    v-if="d.template === 'dividedJunction'"
    label="中间道路名称"
    v-model="d.centerRoad"
    :maxlength="10"
  />
  <template v-if="rows"
    ><section
      v-for="(row, index) in d.destinations"
      :key="index"
      class="sign-destination"
    >
      <div class="sign-destination-heading">
        <h3>目的地 {{ index + 1 }}</h3>
        <HButton
          v-if="d.destinations.length > 1"
          variant="ghost"
          size="xs"
          @click="d.destinations.splice(index, 1)"
          >删除</HButton
        >
      </div>
      <SignDestinationFields :row="row" :template="d.template" />
    </section>
    <HButton
      variant="outline"
      :disabled="d.destinations.length >= rowLimit"
      @click="addRow"
      >添加目的地</HButton
    ></template
  >
  <template v-if="d.template === 'free'"
    ><HNumberInput
      label="画板宽度"
      v-model="d.freeWidth"
      :min="200"
      :max="4000" /><HNumberInput
      label="画板高度"
      v-model="d.freeHeight"
      :min="200"
      :max="4000"
  /></template>
  <HNumberInput
    label="输出宽度（px）"
    v-model="d.outputWidth"
    :min="128"
    :max="7680"
  />
</template>
