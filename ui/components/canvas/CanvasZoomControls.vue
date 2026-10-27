<script setup lang="ts">
import HIconButton from "@celestia-island/hikari/components/HkIconButton.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
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
    <HIconButton variant="ghost" :size="28" class="icon-button" aria-label="缩小画布" title="缩小画布" :disabled="zoom <= .25" @click="viewport.setZoom(zoom / 1.25)"><ZoomOut :size="15" /></HIconButton>
    <HSelect panel-title="画布缩放" title="Ctrl/⌘ + 滚轮缩放；滚轮或中键平移" :model-value="String(zoom)" :options="options.map(value => ({ value: String(value), label: value === 1 ? '适应' : `${Math.round(value * 100)}%` }))" @update:model-value="Number($event) === 1 ? viewport.resetZoom() : viewport.setZoom(Number($event))" />
    <HIconButton variant="ghost" :size="28" class="icon-button" aria-label="放大画布" title="放大画布" :disabled="zoom >= 8" @click="viewport.setZoom(zoom * 1.25)"><ZoomIn :size="15" /></HIconButton>
    <HIconButton :variant="panMode ? 'secondary' : 'ghost'" :size="28" class="icon-button" aria-label="平移画布" title="平移画布（也可中键拖动）" :aria-pressed="panMode" :class="{ active: panMode }" @click="panMode = !panMode"><Hand :size="15" /></HIconButton>
  </div>
</template>
