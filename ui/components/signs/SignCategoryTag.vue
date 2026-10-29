<script setup lang="ts">
import { computed } from "vue";
import HTag from "@celestia-island/hikari/components/HkTag.tsx";
import {
  signCategory,
  type SignDesign,
  type SignTemplate,
} from "../../domain/signs/model";
const props = defineProps<{ design: SignDesign }>();
const labels: Partial<Record<SignTemplate, string>> = {
  nationalExpressway: "高速",
  provincialExpressway: "省高速",
  national: "国道",
  provincial: "省道",
  county: "县道",
  township: "乡道",
  roadName: "城市道路",
  urbanExpressway: "快速路",
  roundabout: "环岛",
};
const label = computed(
  () =>
    labels[props.design.template] ??
    (
      {
        junctions: "交叉口",
        distances: "地点距离",
      } as Record<string, string>
    )[signCategory(props.design.template)],
);
const variant = computed(() =>
  ["nationalExpressway", "provincialExpressway", "urbanExpressway"].includes(
    props.design.template,
  )
    ? "success"
    : props.design.template === "national"
      ? "danger"
      : props.design.template === "provincial"
        ? "warning"
        : ["county", "township"].includes(props.design.template)
          ? "default"
          : "info",
);
</script>
<template>
  <HTag
    :variant="variant"
    :style="{
      '--hi-color-success': '#166534',
      '--hi-color-danger': '#b91c1c',
      '--hi-color-warning': '#a16207',
      '--hi-color-info': '#1e4e8c',
    }"
    >{{ label }}</HTag
  >
</template>
