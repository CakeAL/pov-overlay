<script setup lang="ts">
import { Route, Check, Plus, FileVideo } from "lucide-vue-next";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
import { dateText, timeZone } from "../../lib/format";
import { formatTime } from "../../domain/telemetry";
const { media, playback, timeline } = useEditorContext();
const { track, asset, gpxName, busy, gpxInput, videoInput } = toRefs(media);
const { chooseGpx, chooseVideo, selectedFile,chooseImage,selectedImage } = media;
const {image,imageInput,backgroundMode}=toRefs(media);
const { videoDuration } = toRefs(playback);
const { routePath } = toRefs(timeline);
</script>

<template>
  <section class="panel-section">
    <div class="section-title">
      <span><span class="section-index">01</span> 素材</span
      ><span class="muted">可选视频或图片</span>
    </div>
    <button
      class="asset-card"
      :class="{ imported: track }"
      :disabled="busy"
      @click="chooseGpx"
      data-testid="import-gpx"
    >
      <span class="asset-icon track-icon"><Route :size="20" /></span
      ><span class="asset-copy"
        ><strong>{{ gpxName || "导入 GPX 轨迹" }}</strong
        ><small>{{
          track
            ? `${track.samples.length.toLocaleString()} 个轨迹点 · ${(track.distanceMeters / 1000).toFixed(2)} km`
            : "GPX 轨迹文件"
        }}</small></span
      ><Check v-if="track" :size="15" class="success-icon" /><Plus
        v-else
        :size="17"
      />
    </button>
    <button
      class="asset-card"
      :class="{ imported: asset }"
      :disabled="busy"
      @click="chooseVideo"
      data-testid="import-video"
    >
      <span class="asset-icon video-icon"><FileVideo :size="20" /></span
      ><span class="asset-copy"
        ><strong>{{ asset?.name || "导入预览视频" }}</strong
        ><small>{{
          asset
            ? `${formatTime(videoDuration)} · 仅用于画布预览`
            : "MP4 / MOV"
        }}</small></span
      ><Check v-if="asset" :size="15" class="success-icon" /><Plus
        v-else
        :size="17"
      />
    </button>
    <button class="asset-card" :disabled="busy" @click="chooseImage" data-testid="import-image"><span class="asset-copy"><strong>{{image?.name || '导入背景图'}}</strong><small>PNG / JPEG / WebP / GIF / AVIF</small></span><Plus :size="17"/></button>
    <input ref="imageInput" class="file-input" data-testid="image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" @change="selectedImage"/>
    <label class="field-label background-selector">背景<select aria-label="预览背景" v-model="backgroundMode"><option value="none">无背景</option><option value="image" :disabled="!image">图片</option><option value="video" :disabled="!asset">视频</option></select></label>
    <input
      ref="gpxInput"
      data-testid="gpx-file"
      class="file-input"
      type="file"
      accept=".gpx,application/gpx+xml"
      @change="selectedFile($event, 'gpx')"
    />
    <input
      ref="videoInput"
      data-testid="video-file"
      class="file-input"
      type="file"
      accept="video/*,.mov,.mkv,.mts,.m2ts"
      @change="selectedFile($event, 'video')"
    />
    <div v-if="track" class="track-summary">
      <svg viewBox="0 0 120 52" aria-hidden="true">
        <path :d="routePath" />
      </svg>
      <div>
        <span>GPX 起始时间</span><strong>{{ dateText(track.startMs) }}</strong
        ><small
          >{{ formatTime((track.endMs - track.startMs) / 1000) }} ·
          {{ timeZone }}</small
        >
      </div>
    </div>
  </section>
</template>
