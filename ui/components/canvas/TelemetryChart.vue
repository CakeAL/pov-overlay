<script setup lang="ts">
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
import { PROFILE_WIDTH, PROFILE_HEIGHT } from "../../domain/trackProfile";
import { formatTime } from "../../domain/telemetry";
import { dateText } from "../../lib/format";
const { profile, playback } = useEditorContext();
const { geometry, hover, hoverFraction, cursorFraction } = toRefs(profile);
const { duration, currentTime } = toRefs(playback);
</script>

<template>
  <div
    v-if="geometry"
    id="telemetry-profile"
    class="track-profile"
    data-testid="track-profile"
  >
    <div class="profile-legend">
      <span class="profile-speed-key">速度 · km/h</span>
      <span class="profile-elevation-key">海拔 · m</span>
    </div>
    <div class="profile-axis profile-speed-key" aria-hidden="true">
      <span>{{ geometry.speedScale.max }}</span><span>0</span>
    </div>
    <div
      class="profile-plot"
      data-testid="profile-plot"
      tabindex="0"
      role="slider"
      aria-label="速度与海拔曲线，点击定位播放"
      aria-valuemin="0"
      :aria-valuemax="duration"
      :aria-valuenow="currentTime"
      :aria-valuetext="formatTime(currentTime)"
      @pointermove="profile.pointAt"
      @pointerleave="hoverFraction = null"
      @blur="hoverFraction = null"
      @click="profile.seek"
      @keydown="profile.keydown"
    >
      <svg
        :viewBox="`0 0 ${PROFILE_WIDTH} ${PROFILE_HEIGHT}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path v-for="y in [6, 60, 114]" :key="y" :d="`M0,${y} H${PROFILE_WIDTH}`" class="profile-grid" />
        <path :d="geometry.speedArea" class="profile-speed-area" />
        <path :d="geometry.speedPath" class="profile-speed-line" />
        <path :d="geometry.elevationPath" class="profile-elevation-line" />
        <line :x1="cursorFraction * PROFILE_WIDTH" :x2="cursorFraction * PROFILE_WIDTH" y1="0" :y2="PROFILE_HEIGHT" class="profile-playhead" />
        <template v-if="hover">
          <line :x1="hover.fraction * PROFILE_WIDTH" :x2="hover.fraction * PROFILE_WIDTH" y1="0" :y2="PROFILE_HEIGHT" class="profile-crosshair" />
        </template>
      </svg>
      <i
        v-if="hover?.speedY != null"
        class="profile-point speed-point"
        :style="{ left: `${hover.fraction * 100}%`, top: `${hover.speedY / PROFILE_HEIGHT * 100}%` }"
      ></i>
      <i
        v-if="hover?.elevationY != null"
        class="profile-point elevation-point"
        :style="{ left: `${hover.fraction * 100}%`, top: `${hover.elevationY / PROFILE_HEIGHT * 100}%` }"
      ></i>
      <div
        v-if="hover"
        class="profile-tooltip"
        data-testid="profile-details"
        :style="{ '--hover-left': `${hover.fraction * 100}%` }"
      >
        <div class="profile-detail-time">
          <strong>{{ formatTime(hover.elapsedSeconds) }}.{{ Math.floor(hover.elapsedSeconds * 10) % 10 }}</strong>
          <time>{{ dateText(hover.timestampMs) }}</time>
        </div>
        <template v-if="hover.sample">
          <dl>
            <div><dt>速度</dt><dd>{{ hover.speed == null ? '—' : `${hover.speed.toFixed(1)} km/h` }}</dd></div>
            <div><dt>海拔</dt><dd>{{ hover.sample.elevation == null ? '—' : `${hover.sample.elevation.toFixed(1)} m` }}</dd></div>
            <div><dt>距离</dt><dd>{{ hover.sample.distanceMeters == null ? '—' : `${(hover.sample.distanceMeters / 1000).toFixed(2)} km` }}</dd></div>
            <div><dt>航向</dt><dd>{{ hover.sample.headingDeg == null ? '—' : `${hover.sample.headingDeg.toFixed(1)}°` }}</dd></div>
          </dl>
          <div class="profile-coordinates" title="WGS84 经纬度">
            {{ hover.sample.latitude.toFixed(6) }}°, {{ hover.sample.longitude.toFixed(6) }}°
          </div>
        </template>
        <p v-else class="profile-no-data">该时刻无 GPX 数据</p>
      </div>
    </div>
    <div class="profile-axis profile-elevation-key" aria-hidden="true">
      <span>{{ geometry.elevationScale?.max ?? '—' }}</span>
      <span>{{ geometry.elevationScale?.min ?? '—' }}</span>
    </div>
  </div>
</template>
