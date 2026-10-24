<script setup lang="ts">
import { ref, toRefs, watch } from 'vue';
import { X, FolderOpen } from 'lucide-vue-next';
import { useEditorContext } from '../../editor/context';
const { documents } = useEditorContext();
const { libraryOpen, libraryKind, entries, busy } = toRefs(documents);
const dialog = ref<HTMLDialogElement>();
watch(libraryOpen, value => value ? dialog.value?.showModal() : dialog.value?.close(), { flush: 'post' });
</script>
<template>
  <dialog ref="dialog" class="export-dialog document-library" aria-label="本地文档库" @cancel.prevent="libraryOpen = false" @close="libraryOpen = false" @keydown.stop @drop.prevent.stop @dragover.prevent.stop>
    <header class="export-header"><h2>{{ libraryKind === 'project' ? '打开工程' : '载入预设' }}</h2><button class="icon-button" aria-label="关闭文档库" @click="libraryOpen = false"><X :size="18" /></button></header>
    <div class="library-entries"><p v-if="busy">正在读取…</p><p v-else-if="!entries.length">暂无{{ libraryKind === 'project' ? '工程' : '预设' }}</p>
      <button v-for="entry in entries" :key="entry.id" :disabled="busy" @click="documents.openEntry(entry.id)"><FolderOpen :size="18" /><strong>{{ entry.name }}</strong><time>{{ new Date(entry.modifiedMs).toLocaleString() }}</time></button>
    </div>
    <footer class="export-actions"><button :disabled="busy" @click="documents.importExternal">从文件导入</button></footer>
  </dialog>
</template>
