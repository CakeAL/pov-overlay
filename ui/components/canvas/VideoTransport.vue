<script setup lang="ts">
import {
  SkipBack,
  Pause,
  Play,
  Link2,
  VolumeX,
  Volume2,
} from "lucide-vue-next";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
import { formatTime } from "../../domain/telemetry";
import { dateText } from "../../lib/format";
const { media, playback, alignment, timeline } = useEditorContext();
const { activeVideo:asset } = toRefs(media);
const { duration, currentTime, playing, muted } = toRefs(playback);
const { seek, togglePlay } = playback;
const { alignmentKnown, offsetLabel } = toRefs(alignment);
const { timelineTicks, coverage, absoluteTime, sample } = toRefs(timeline);
</script>

<template>
  <div class="transport-panel">
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
    <div class="timeline">
      <div class="timeline-ticks">
        <span v-for="(tickLabel, index) in timelineTicks" :key="index">{{
          tickLabel
        }}</span>
      </div>
      <div class="timeline-rail">
        <div class="timeline-background"></div>
        <div v-if="coverage" class="timeline-gpx" :style="coverage"></div>
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
      <div class="timeline-legend">
        <span><i></i> GPX 覆盖范围</span
        ><span>{{
          absoluteTime && sample ? dateText(absoluteTime) : "等待有效轨迹时间"
        }}</span>
      </div>
    </div>
  </div>
</template>
