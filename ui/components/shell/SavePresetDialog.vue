<script setup lang="ts">
import { ref, toRefs, watch, nextTick } from 'vue';
import { X } from 'lucide-vue-next';
import { useEditorContext } from '../../editor/context';
const { documents } = useEditorContext();
const { saveOpen, draftName, busy } = toRefs(documents);
const dialog = ref<HTMLDialogElement>(), input = ref<HTMLInputElement>();
watch(saveOpen, async value => { if (value) { dialog.value?.showModal(); await nextTick(); input.value?.select(); } else dialog.value?.close(); }, { flush: 'post' });
function close() { if (!busy.value) saveOpen.value = false; }
</script>
<template>
  <dialog ref="dialog" class="export-dialog preset-save-dialog" aria-label="保存预设" @cancel.prevent="close" @close="saveOpen = false" @keydown.stop @drop.prevent.stop @dragover.prevent.stop>
    <form @submit.prevent="documents.saveCurrent('preset', draftName)">
      <header class="export-header"><h2>保存预设</h2><button type="button" class="icon-button" aria-label="关闭保存预设" :disabled="busy" @click="close"><X :size="18" /></button></header>
      <label class="export-row">名称<input ref="input" aria-label="预设名称" v-model="draftName" autofocus maxlength="60" required :disabled="busy" /></label>
      <footer class="export-actions"><button type="button" :disabled="busy" @click="close">取消</button><button type="submit" :disabled="busy || !draftName.trim()">保存</button></footer>
    </form>
  </dialog>
</template>
