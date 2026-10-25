<script setup lang="ts">
import { toRefs } from 'vue';
import { RotateCcw } from 'lucide-vue-next';
import { useEditorContext } from '../../editor/context';
const { elevation, media } = useEditorContext();
const { busy, processed, total, hasOverrides } = toRefs(elevation);
</script>
<template>
  <div class="elevation-controls">
    <div class="setting-row"><span title="地形海拔来自 Mapterhorn">海拔</span><div class="elevation-actions">
      <button class="elevation-replace" :disabled="busy || !media.track" title="从 Mapterhorn 联网获取地形海拔，替换已启用轨迹的海拔数据，原始值可恢复" @click="elevation.run">{{ busy ? '正在替换…' : '替换原始数据' }}</button>
      <button v-if="hasOverrides" class="icon-button" :disabled="busy" title="恢复原始海拔" aria-label="恢复原始海拔" @click="elevation.restore"><RotateCcw :size="16" /></button>
    </div></div>
    <div v-if="busy" class="elevation-progress" role="status"><progress :value="processed" :max="Math.max(1, total)" />{{ processed }} / {{ total }}<button class="text-button" @click="elevation.cancel">取消</button></div>
  </div>
</template>
