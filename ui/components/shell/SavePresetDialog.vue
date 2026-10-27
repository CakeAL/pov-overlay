<script setup lang="ts">
import { toRefs } from 'vue';
import HModal from '@celestia-island/hikari/components/HkModal.tsx';
import HInput from '@celestia-island/hikari/components/HkInput.tsx';
import HButton from '@celestia-island/hikari/components/HkButton.tsx';
import { useEditorContext } from '../../editor/context';
const { documents } = useEditorContext();
const { saveOpen, draftName, busy } = toRefs(documents);
</script>
<template>
  <HModal v-model="saveOpen" title="保存预设" width="sm" :closable="!busy">
    <form id="save-preset-form" @submit.prevent="documents.saveCurrent('preset', draftName)" @drop.prevent.stop @dragover.prevent.stop>
      <HInput label="名称" aria-label="预设名称" v-model="draftName" align="start" maxlength="60" required :disabled="busy" @focus="($event.target as HTMLInputElement).select()" :submit-on-enter="() => draftName.trim() && !busy && documents.saveCurrent('preset', draftName)" />
    </form>
    <template #footer>
      <HButton variant="ghost" :disabled="busy" @click="saveOpen = false">取消</HButton>
      <HButton type="submit" form="save-preset-form" :disabled="busy || !draftName.trim()" :loading="busy">保存</HButton>
    </template>
  </HModal>
</template>
