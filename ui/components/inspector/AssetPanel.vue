<script setup lang="ts">
import HCheckbox from "@celestia-island/hikari/components/HkCheckbox.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { Route, Check, Plus, FileVideo } from "lucide-vue-next";
import { toRefs } from "vue";
import TrackTimeZoneField from "./TrackTimeZoneField.vue";
import { useEditorContext } from "../../editor/context";
import { dateText, timeZone } from "../../lib/format";
import { formatTime } from "../../domain/telemetry";
const { media, playback, timeline } = useEditorContext();
const { track, asset, busy, gpxInput, videoInput } = toRefs(media);
const { chooseGpx, chooseVideo, selectedFile, chooseImage, selectedImage } =
  media;
const { image, imageInput, backgroundMode, sources, joinSources, mergeInfo } =
  toRefs(media);
const { videoDuration } = toRefs(playback);
const { routePath, routePoint } = toRefs(timeline);
</script>

<template>
  <section class="panel-section">
    <div class="section-title">素材</div>
    <HButton variant="outline" size="sm"
      class="asset-card"
      :class="{ imported: track }"
      :disabled="busy"
      @click="chooseGpx"
      data-testid="import-gpx"
    >
      <span class="asset-icon track-icon"><Route :size="20" /></span
      ><span class="asset-copy"
        ><strong>{{ sources.length ? "添加 GPX" : "导入 GPX" }}</strong
        ><small v-if="track"
          >{{ track.samples.length.toLocaleString() }} 个轨迹点 ·
          {{ (track.distanceMeters / 1000).toFixed(2) }} km</small
        ></span
      ><Check v-if="track" :size="15" class="success-icon" /><Plus
        v-else
        :size="17"
      />
    </HButton>
    <div class="track-sources">
      <div v-for="source in sources" :key="source.id" class="track-source-item">
        <div class="track-source">
          <HCheckbox :model-value="source.enabled !== false" :label="source.name" @update:model-value="media.toggleSource(source.id)" /><HButton variant="ghost" size="sm"
            :aria-label="`移除 ${source.name}`"
            @click="media.removeSource(source.id)"
          >
            ×
          </HButton>
        </div>
        <TrackTimeZoneField
          :source="source"
          @change="media.setSourceTimeZone(source.id, $event)"
        />
      </div>
    </div>
    <HCheckbox v-if="sources.length > 1" v-model="joinSources" label="连接相邻文件的连续点" />
    <p v-if="sources.length > 1" class="field-hint">
      已替换 {{ mergeInfo.overwritten }} 点 · {{ mergeInfo.breaks }} 处断点
    </p>
    <HButton variant="outline" size="sm"
      class="asset-card"
      :class="{ imported: asset }"
      :disabled="busy"
      @click="chooseVideo"
      data-testid="import-video"
    >
      <span class="asset-icon video-icon"><FileVideo :size="20" /></span
      ><span class="asset-copy"
        ><strong>{{ asset?.name || "导入预览视频" }}</strong
        ><small v-if="asset">{{ formatTime(videoDuration) }}</small></span
      ><Check v-if="asset" :size="15" class="success-icon" /><Plus
        v-else
        :size="17"
      />
    </HButton>
    <HButton variant="outline" size="sm"
      class="asset-card"
      :disabled="busy"
      @click="chooseImage"
      data-testid="import-image"
    >
      <span class="asset-copy"
        ><strong>{{ image?.name || "导入背景图" }}</strong
        ><small v-if="image">{{ image.width }} × {{ image.height }}</small></span
      ><Plus :size="17" />
    </HButton>
    <input
      ref="imageInput"
      class="file-input"
      data-testid="image-file"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
      @change="selectedImage"
    />
    <div class="field-label background-selector"
      ><span>背景</span><HSelect panel-title="预览背景" v-model="backgroundMode" :options="[{ value: 'none', label: '无背景' }, { value: 'image', label: '图片', disabled: !image }, { value: 'video', label: '视频', disabled: !asset }]" /></div
    >
    <input
      ref="gpxInput"
      data-testid="gpx-file"
      class="file-input"
      type="file"
      accept=".gpx,application/gpx+xml"
      multiple
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
      <svg viewBox="0 0 240 110" aria-hidden="true">
        <path :d="routePath" />
        <circle
          v-if="routePoint"
          :cx="routePoint.x"
          :cy="routePoint.y"
          r="4"
          fill="#476e39"
        />
      </svg>
      <div>
        <span>GPX 起始时间</span><strong>{{ dateText(track.startMs) }}</strong
        ><small
          >{{ formatTime((track.endMs - track.startMs) / 1000) }} · {{
            timeZone
          }}</small
        >
      </div>
    </div>
  </section>
</template>
