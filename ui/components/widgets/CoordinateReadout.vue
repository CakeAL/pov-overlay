<script setup lang="ts">
import { Crosshair } from "lucide-vue-next";
import type { Sample } from "../../domain/types";
import { formatCoordinate } from "../../domain/telemetry";
defineProps<{ sample: Sample | null }>();
</script>

<template>
  <div class="coordinate-icon"><Crosshair :size="20" /></div>
  <div class="coordinate-readings">
    <div>
      <span>LAT</span
      ><strong>{{ formatCoordinate(sample?.latitude, "lat") }}</strong>
    </div>
    <div>
      <span>LON</span
      ><strong>{{ formatCoordinate(sample?.longitude, "lon") }}</strong>
    </div>
  </div>
</template>
