<script setup lang="ts">
import { FileVideo, Upload } from "lucide-vue-next";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
const { media, layout } = useEditorContext();
const { busy } = toRefs(media);
const { chooseVideo } = media;
const { selectedId } = toRefs(layout);
</script>

<template>
  <div class="empty-stage" @pointerdown="selectedId = ''">
    <svg
      class="contour-art"
      viewBox="0 0 960 540"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g
        v-for="i in 13"
        :key="i"
        :transform="`translate(${(i - 7) * 24} ${(i - 7) * 16})`"
      >
        <path
          d="M-170 510C-60 230 110 330 196 164S456 110 495 245 690 442 810 280 970 242 1110 50"
        />
      </g>
    </svg>
    <div class="empty-content">
      <div class="empty-video-icon">
        <FileVideo :size="28" :stroke-width="1.3" />
      </div>
      <h3>每一帧，都有迹可循</h3>
      <p>导入视频，预览你的运动数据叠加效果</p>
      <HButton
        variant="secondary"
        size="sm"
        :disabled="busy"
        @click.stop="chooseVideo"
        ><Upload :size="14" /> 选择预览视频</HButton
      ><span>也可以将 GPX 与视频直接拖到这里</span>
    </div>
  </div>
</template>
