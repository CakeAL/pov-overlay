<script setup lang="ts">
import { Upload } from "lucide-vue-next";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
import EmptyCanvas from "./EmptyCanvas.vue";
import OverlayWidget from "../widgets/OverlayWidget.vue";
const { media, playback, viewport, layout, timeline, drop } =
  useEditorContext();
const { activeVideo:asset,image,backgroundMode } = toRefs(media);
const { video, muted, currentTime, playing } = toRefs(playback);
const { loadedMetadata, videoError } = playback;
const { stageWrap, stage, stageSize } = toRefs(viewport);
const { selectedId, showSafeArea, guides, widgets } = toRefs(layout);
const { sample, status } = toRefs(timeline);
const { dropActive } = toRefs(drop);
</script>

<template>
  <div
    ref="stageWrap"
    class="stage-wrap"
    :class="{ 'is-drag-over': dropActive }"
  >
    <div
      ref="stage"
      class="preview-stage"
      data-testid="preview-stage"
      :style="{
        width: `${stageSize.width}px`,
        height: `${stageSize.height}px`,
      }"
      @pointerdown.self="selectedId = ''"
    >
      <video
        v-if="asset"
        ref="video"
        :key="asset.url"
        :src="asset.url"
        :muted="muted"
        playsinline
        preload="metadata"
        @loadedmetadata="loadedMetadata"
        @timeupdate="currentTime = video?.currentTime || 0"
        @play="playing = true"
        @pause="playing = false"
        @ended="playing = false"
        @error="videoError"
      />
      <img v-else-if="backgroundMode === 'image' && image" class="background-image" :src="image.url" alt="预览背景图"/>
      <EmptyCanvas v-else />
      <div v-if="showSafeArea" class="safe-area" aria-hidden="true">
        <i v-for="i in 4" :key="i"></i>
      </div>
      <div v-if="guides.x" class="snap-guide vertical"></div>
      <div v-if="guides.y" class="snap-guide horizontal"></div>
      <OverlayWidget
        v-for="widget in widgets.filter((item) => item.visible)"
        :key="widget.id"
        :widget="widget"
        :sample="sample"
      />
      <div v-if="dropActive" class="drop-target">
        <Upload :size="30" /><strong>松开以导入素材</strong
        ><span>GPX 轨迹 / 预览视频</span>
      </div>
    </div>
    <div class="canvas-caption">
      <span
        ><span class="status-dot" :class="{ connected: sample }"></span
        >{{ status }}</span
      ><span v-if="stageSize.width"
        >{{ Math.round(stageSize.width) }} ×
        {{ Math.round(stageSize.height) }}
        <span class="caption-separator">·</span> 预览尺寸</span
      >
    </div>
  </div>
</template>
