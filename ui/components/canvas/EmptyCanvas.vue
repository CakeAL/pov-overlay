<script setup lang="ts">
import {toRefs} from 'vue';
import {useEditorContext} from '../../editor/context';
const {media}=useEditorContext();
const {track,busy}=toRefs(media);
</script>
<template><div class="empty-stage"><div v-if="!track" class="empty-content"><p>导入 GPX 或预览素材</p><button class="text-button" :disabled="busy" @click="media.chooseGpx">选择 GPX</button></div></div></template>
