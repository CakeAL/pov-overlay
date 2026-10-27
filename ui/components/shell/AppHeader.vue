<script setup lang="ts">
import HIconButton from "@celestia-island/hikari/components/HkIconButton.tsx";
import { Settings } from 'lucide-vue-next';
import { computed, ref, toRefs, type ComponentPublicInstance } from 'vue';
import HButton from '@celestia-island/hikari/components/HkButton.tsx';
import HMenu from '@celestia-island/hikari/components/HkMenu.tsx';
import { useEditorContext } from '../../editor/context';
const { documents, videoExport, appSettings } = useEditorContext();
const { presetName, busy, presetInput } = toRefs(documents);
const fileOpen = ref(false), trigger = ref<ComponentPublicInstance>();
const items = computed(() => [
  { key: 'load', label: '载入预设', disabled: busy.value },
  { key: 'save', label: '保存预设', disabled: busy.value },
  { key: 'folder', label: '打开预设文件夹', disabled: busy.value },
]);
function choose(key: string) {
  if (key === 'load') void documents.choose('preset');
  else if (key === 'save') documents.requestSavePreset();
  else if (key === 'folder') void documents.openPresetFolder();
}
</script>
<template>
  <header class="app-header">
    <HButton ref="trigger" variant="ghost" size="sm" :aria-expanded="fileOpen" aria-haspopup="menu" @click="fileOpen = !fileOpen">文件</HButton>
    <HMenu v-model:open="fileOpen" title="文件" :anchor-ref="trigger?.$el" :items="items" @select="choose" />
    <span class="current-preset">{{ presetName || 'POV Overlay' }}</span>
    <div class="document-actions"><HIconButton variant="ghost" :size="28" aria-label="应用设置" title="设置" @click="appSettings.open"><Settings :size="18" /></HIconButton><HButton size="sm" :disabled="!videoExport.ready || busy" @click="videoExport.show">导出视频</HButton></div>
    <input ref="presetInput" class="file-input" data-testid="preset-file" type="file" accept=".json,application/json" @change="documents.selected($event, 'preset')" />
  </header>
</template>
