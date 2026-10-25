<script setup lang="ts">
import { computed, toRefs } from 'vue';
import { ZoomIn, ZoomOut, Hand } from 'lucide-vue-next';
import { useEditorContext } from '../../editor/context';
const { viewport } = useEditorContext();
const { zoom, panMode } = toRefs(viewport);
const values = [.25, .5, .75, 1, 1.5, 2, 3, 4, 6, 8];
const options = computed(() => values.includes(zoom.value) ? values : [...values, zoom.value].sort((a,b) => a-b));
</script>
<template>
  <div class="canvas-zoom">
    <button class="icon-button" aria-label="缩小画布" title="缩小画布" :disabled="zoom <= .25" @click="viewport.setZoom(zoom / 1.25)"><ZoomOut :size="15" /></button>
    <select aria-label="画布缩放" title="Ctrl/⌘ + 滚轮缩放；滚轮或中键平移" :value="zoom" @change="Number(($event.target as HTMLSelectElement).value) === 1 ? viewport.resetZoom() : viewport.setZoom(Number(($event.target as HTMLSelectElement).value))"><option v-for="value in options" :key="value" :value="value">{{ value === 1 ? '适应' : `${Math.round(value * 100)}%` }}</option></select>
    <button class="icon-button" aria-label="放大画布" title="放大画布" :disabled="zoom >= 8" @click="viewport.setZoom(zoom * 1.25)"><ZoomIn :size="15" /></button>
    <button class="icon-button" aria-label="平移画布" title="平移画布（也可中键拖动）" :aria-pressed="panMode" :class="{ active: panMode }" @click="panMode = !panMode"><Hand :size="15" /></button>
  </div>
</template>
