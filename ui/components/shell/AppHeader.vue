<script setup lang="ts">
import { toRefs } from 'vue';
import { useEditorContext } from '../../editor/context';
const { documents, videoExport } = useEditorContext();
const { presetName, busy, presetInput } = toRefs(documents);
</script>
<template>
  <header class="app-header">
    <details class="file-menu"><summary>文件</summary><div class="file-menu-items" @click="($event.currentTarget as HTMLElement).parentElement?.removeAttribute('open')">
      <button :disabled="busy" @click="documents.choose('preset')">载入预设</button>
      <button :disabled="busy" @click="documents.requestSavePreset">保存预设</button>
      <button :disabled="busy" @click="documents.openPresetFolder">打开预设文件夹</button>
    </div></details>
    <span class="current-preset">{{ presetName || 'POV Overlay' }}</span>
    <div class="document-actions"><button :disabled="!videoExport.ready || busy" @click="videoExport.show">导出视频</button></div>
    <input ref="presetInput" class="file-input" data-testid="preset-file" type="file" accept=".json,application/json" @change="documents.selected($event, 'preset')" />
  </header>
</template>
