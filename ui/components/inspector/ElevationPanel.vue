<script setup lang="ts">
import { toRefs } from 'vue';
import { useEditorContext } from '../../editor/context';
const { elevation, media } = useEditorContext();
const { busy, mode, processed, total, hasOverrides } = toRefs(elevation);
</script>
<template>
  <div class="elevation-controls">
    <label class="setting-row">海拔<select aria-label="海拔替换方式" v-model="mode" :disabled="busy"><option value="fill">补全缺失</option><option value="replace">替换全部</option></select></label>
    <div class="elevation-actions"><button class="text-button" :disabled="busy || !media.track" title="从 Mapterhorn 联网获取地形瓦片，仅处理已启用轨迹" @click="elevation.run">获取海拔</button><button v-if="hasOverrides" class="text-button" :disabled="busy" @click="elevation.restore">恢复原始</button><a href="https://mapterhorn.com/attribution/" target="_blank" rel="noreferrer" title="海拔数据来源及署名">Mapterhorn</a></div>
    <div v-if="busy" class="elevation-progress" role="status"><progress :value="processed" :max="Math.max(1, total)" />{{ processed }} / {{ total }}<button class="text-button" @click="elevation.cancel">取消</button></div>
  </div>
</template>
