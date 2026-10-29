<script setup lang="ts">
import { computed } from "vue";
import HInput from "@celestia-island/hikari/components/HkInput.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import HSwitch from "@celestia-island/hikari/components/HkSwitch.tsx";
import {
  DIRECTIONS,
  SIGN_TEMPLATES,
  type SignDestination,
  type SignTemplate,
} from "../../domain/signs/model";
const props = defineProps<{ row: SignDestination; template: SignTemplate }>();
const contentTypes = computed(() => [
  { value: "text", label: "地点或道路名称" },
  { value: "route", label: "道路编号牌" },
  ...(props.template === "distance"
    ? [{ value: "roadName", label: "蓝底路名牌" }]
    : []),
]);
const hasContentType = computed(() =>
  [
    "distance",
    "crossroads",
    "roundabout",
    "tJunction",
    "wideTJunction",
    "dividedJunction",
    "direction",
    "laneGuidance",
  ].includes(props.template),
);
const directionChoices = computed(() =>
  DIRECTIONS.filter((x) =>
    ["tJunction", "wideTJunction"].includes(props.template)
      ? ["straight", "right"].includes(x.value)
      : ["crossroads", "dividedJunction"].includes(props.template)
        ? ["straight", "left", "right"].includes(x.value)
        : ["interchange", "fork"].includes(props.template)
          ? ["left", "right"].includes(x.value)
          : true,
  ),
);
</script>
<template>
  <label v-if="hasContentType"
    >信息类型<HSelect
      :model-value="row.content ?? 'text'"
      :options="contentTypes"
      @update:model-value="row.content = $event as SignDestination['content']"
  /></label>
  <template v-if="row.content === 'route'">
    <label
      >编号类型<HSelect
        :model-value="row.routeType ?? 'national'"
        :options="
          SIGN_TEMPLATES.filter((t) =>
            [
              'nationalExpressway',
              'national',
              'provincial',
              'county',
              'township',
            ].includes(t.value),
          ).map((t) => ({ value: t.value, label: t.label }))
        "
        @update:model-value="
          row.routeType = $event as SignDestination['routeType']
        "
    /></label>
    <HInput
      label="完整道路编号"
      v-model="row.routeCode"
      placeholder="G101"
      :maxlength="5"
    />
    <label
      v-if="
        ['crossroads', 'wideTJunction', 'dividedJunction'].includes(template)
      "
      class="sign-maker-toggle"
      >编号置于箭杆<HSwitch v-model="row.onArrow"
    /></label>
    <HInput
      v-if="row.onArrow"
      label="端点道路编号（可选）"
      v-model="row.endpointRouteCode"
      placeholder="S206"
      :maxlength="4"
    />
  </template>
  <HInput
    :label="row.content === 'route' ? '端点地点名称（可选）' : '名称'"
    v-model="row.name"
    :maxlength="20"
  />
  <HInput label="英文 / 拼音（可选）" v-model="row.english" :maxlength="80" />
  <HInput
    v-if="template === 'distance'"
    label="距离（km）"
    v-model="row.distance"
    :maxlength="8"
  />
  <label v-else
    >方向<HSelect v-model="row.direction" :options="directionChoices"
  /></label>
</template>
