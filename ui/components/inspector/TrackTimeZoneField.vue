<script setup lang="ts">
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import type { TrackSource } from "../../domain/types";
import { trackTimeOffsets, utcOffsetLabel } from "../../domain/trackTime";
const props = defineProps<{ source: TrackSource }>();
const emit = defineEmits<{ change: [offsetMinutes: number | null] }>();
function selected(value: string) {
  emit("change", value === "file" ? null : Number(value));
}
</script>

<template>
  <label
    class="track-time-zone"
    title="本地时间被误标为 UTC（Z）时，选择实际记录时区。校正会更新视频对齐。"
  >
    <span>UTC 标注校正</span>
    <HSelect :panel-title="`${props.source.name} 的记录时区`" :model-value="String(props.source.utcLabelOffsetMinutes ?? 'file')" :options="[{ value: 'file', label: '不校正（按文件）' }, ...trackTimeOffsets.map(offset => ({ value: String(offset), label: utcOffsetLabel(offset) + (offset === 480 ? '（东八区）' : '') }))]" @update:model-value="selected" />
  </label>
</template>
