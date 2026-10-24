<script setup lang="ts">
import { computed } from "vue";
import { Gauge } from "lucide-vue-next";
import type { Sample } from "../../domain/types";
const props = defineProps<{ sample: Sample | null }>();
const hasSpeed = computed(
  () => props.sample != null && props.sample.speedValid !== false,
);
</script>

<template>
  <div class="speed-heading">
    <Gauge :size="15" /><span>SPEED</span
    ><span class="widget-live-dot" :class="{ offline: !hasSpeed }"></span>
  </div>
  <div class="speed-reading">
    <strong>{{
      hasSpeed && sample ? (sample.speedMps * 3.6).toFixed(1) : "—"
    }}</strong
    ><span>km/h</span>
  </div>
  <div class="speed-meter">
    <i
      v-for="i in 24"
      :key="i"
      :class="{
        lit:
          hasSpeed &&
          sample &&
          i <= Math.min(24, ((sample.speedMps * 3.6) / 60) * 24),
      }"
    ></i>
  </div>
</template>
