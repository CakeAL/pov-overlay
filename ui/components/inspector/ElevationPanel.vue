<script setup lang="ts">
import HIconButton from "@celestia-island/hikari/components/HkIconButton.tsx";
import HProgressBar from "@celestia-island/hikari/components/HkProgressBar.tsx";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { toRefs } from 'vue';
import { RotateCcw, ExternalLink } from 'lucide-vue-next';
import { useEditorContext } from '../../editor/context';
import { openExternalUrl } from '../../infrastructure/platform';
const { elevation, media, messages } = useEditorContext();
const { busy, processed, total, hasOverrides } = toRefs(elevation);
async function source() { try { await openExternalUrl('https://mapterhorn.com/'); } catch (reason) { messages.report(reason); } }
</script>
<template>
  <div class="elevation-controls">
    <div class="setting-row"><div class="elevation-source"><span>海拔</span><HButton variant="ghost" size="sm" class="text-button" title="在浏览器打开 Mapterhorn 官网" aria-label="海拔数据来源 Mapterhorn" @click="source">Mapterhorn<ExternalLink :size="12" /></HButton></div><div class="elevation-actions">
      <HButton variant="secondary" size="sm" class="elevation-replace" :disabled="busy || !media.track" title="从 Mapterhorn 联网获取地形海拔，替换已启用轨迹的海拔数据，原始值可恢复" @click="elevation.run">{{ busy ? '正在替换…' : '替换原始数据' }}</HButton>
      <HIconButton variant="ghost" :size="28" v-if="hasOverrides" class="icon-button" :disabled="busy" title="恢复原始海拔" aria-label="恢复原始海拔" @click="elevation.restore"><RotateCcw :size="16" /></HIconButton>
    </div></div>
    <div v-if="busy" class="elevation-progress" role="status"><HProgressBar :value="processed" :max="Math.max(1, total)" />{{ processed }} / {{ total }}<HButton variant="ghost" size="sm" class="text-button" @click="elevation.cancel">取消</HButton></div>
  </div>
</template>
