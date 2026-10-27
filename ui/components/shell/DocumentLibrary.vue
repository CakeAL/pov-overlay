<script setup lang="ts">
import { toRefs } from 'vue';
import { FolderOpen } from 'lucide-vue-next';
import HModal from '@celestia-island/hikari/components/HkModal.tsx';
import HButton from '@celestia-island/hikari/components/HkButton.tsx';
import { useEditorContext } from '../../editor/context';
const { documents } = useEditorContext();
const { libraryOpen, libraryKind, entries, busy } = toRefs(documents);
</script>
<template>
  <HModal v-model="libraryOpen" :title="libraryKind === 'project' ? '打开工程' : '载入预设'" width="md">
    <div class="library-entries" @drop.prevent.stop @dragover.prevent.stop>
      <p v-if="busy" role="status">正在读取…</p><p v-else-if="!entries.length">暂无{{ libraryKind === 'project' ? '工程' : '预设' }}</p>
      <HButton v-for="entry in entries" :key="entry.id" variant="ghost" block :disabled="busy" @click="documents.openEntry(entry.id)"><FolderOpen :size="18" /><strong>{{ entry.name }}</strong><time>{{ new Date(entry.modifiedMs).toLocaleString() }}</time></HButton>
    </div>
    <template #footer><HButton variant="outline" :disabled="busy" @click="documents.importExternal">从文件导入</HButton></template>
  </HModal>
</template>
