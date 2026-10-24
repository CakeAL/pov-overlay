<script setup lang="ts">
import type { TrackSource } from "../../domain/types";
import { trackTimeOffsets, utcOffsetLabel } from "../../domain/trackTime";
const props = defineProps<{ source: TrackSource }>();
const emit = defineEmits<{ change: [offsetMinutes: number | null] }>();
function selected(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  emit("change", value === "file" ? null : Number(value));
}
</script>

<template>
  <label class="track-time-zone">
    <span>UTC 标注校正</span>
    <select
      :aria-label="`${props.source.name} 的记录时区`"
      :value="props.source.utcLabelOffsetMinutes ?? 'file'"
      @change="selected"
    >
      <option value="file">不校正（按文件）</option>
      <option v-for="offset in trackTimeOffsets" :key="offset" :value="offset">
        {{ utcOffsetLabel(offset) }}{{ offset === 480 ? "（东八区）" : "" }}
      </option>
    </select>
  </label>
</template>
