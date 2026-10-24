<script setup lang="ts">
import {
  SkipBack,
  Pause,
  Play,
  Link2,
  VolumeX,
  Volume2,
  ChevronUp,
  ChevronDown,
} from "lucide-vue-next";
import TelemetryChart from "./TelemetryChart.vue";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
import { formatTime } from "../../domain/telemetry";
import { dateText } from "../../lib/format";
const { media, playback, alignment, timeline, profile } = useEditorContext();
const { activeVideo: asset } = toRefs(media);
const { duration, currentTime, playing, muted } = toRefs(playback);
const { seek, togglePlay } = playback;
const { alignmentKnown, offsetLabel } = toRefs(alignment);
const { timelineTicks, coverageRanges, absoluteTime, sample } =
  toRefs(timeline);
</script>

<template>
  <div
    class="transport-panel"
    :class="{ 'has-profile': profile.geometry && !profile.collapsed }"
  >
    <div class="transport-top">
      <div class="transport-buttons">
        <button
          class="icon-button"
          aria-label="回到起点"
          :disabled="!duration"
          @click="seek(0)"
        >
          <SkipBack :size="17" /></button
        ><button
          class="play-button"
          :aria-label="playing ? '暂停' : '播放'"
          :disabled="!duration"
          :title="playing ? '暂停（Space）' : '播放（Space）'"
          @click="togglePlay"
        >
          <Pause v-if="playing" :size="17" fill="currentColor" /><Play
            v-else
            :size="17"
            fill="currentColor"
          />
        </button>
        <div class="playback-time">
          <strong>{{ formatTime(currentTime) }}</strong
          ><span>/ {{ formatTime(duration) }}</span>
        </div>
      </div>
      <div class="transport-meta">
        <button
          v-if="profile.geometry"
          class="text-button"
          :aria-label="profile.collapsed ? '展开曲线' : '收起曲线'"
          :title="profile.collapsed ? '展开速度/海拔曲线' : '收起速度/海拔曲线'"
          :aria-expanded="!profile.collapsed"
          aria-controls="telemetry-profile"
          @click="profile.toggleCollapsed"
        >
          曲线<ChevronDown v-if="profile.collapsed" :size="14" /><ChevronUp
            v-else
            :size="14"
          />
        </button>
        <span v-if="asset && alignmentKnown" class="sync-meta"
          ><Link2 :size="13" /> {{ offsetLabel }}</span
        ><button
          class="icon-button"
          :aria-label="muted ? '取消静音' : '静音'"
          :disabled="!asset"
          @click="muted = !muted"
        >
          <VolumeX v-if="muted" :size="17" /><Volume2 v-else :size="17" />
        </button>
      </div>
    </div>
    <TelemetryChart v-if="!profile.collapsed" />
    <div class="timeline">
      <div class="timeline-ticks">
        <span v-for="(tickLabel, index) in timelineTicks" :key="index">{{
          tickLabel
        }}</span>
      </div>
      <div class="timeline-rail">
        <div class="timeline-background"></div>
        <div
          v-for="(range, index) in coverageRanges"
          :key="index"
          class="timeline-gpx"
          :style="range"
        ></div>
        <div
          class="timeline-progress"
          :style="{
            width: `${duration ? (currentTime / duration) * 100 : 0}%`,
          }"
        ></div>
        <input
          aria-label="播放进度"
          data-testid="timeline"
          type="range"
          min="0"
          :max="duration || 1"
          step="0.01"
          :value="currentTime"
          :disabled="!duration"
          @input="seek(Number(($event.target as HTMLInputElement).value))"
        />
      </div>
      <div v-if="coverageRanges.length" class="timeline-legend">
        <span><i></i> GPX 覆盖范围</span
        ><span>{{
          absoluteTime != null && sample ? dateText(absoluteTime) : ""
        }}</span>
      </div>
    </div>
  </div>
</template>
