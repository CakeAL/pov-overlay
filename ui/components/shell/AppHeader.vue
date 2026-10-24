<script setup lang="ts">
import {toRefs} from 'vue';
import {useEditorContext} from '../../editor/context';
const {documents}=useEditorContext();
const {name,busy,projectInput,presetInput}=toRefs(documents);
</script>
<template><header class="app-header"><input class="project-name" aria-label="工程名称" v-model="name" maxlength="256"/><div class="document-actions"><button :disabled="busy" @click="documents.choose('project')">打开工程</button><button :disabled="busy" @click="documents.saveCurrent('project')">保存工程</button><button :disabled="busy" @click="documents.choose('preset')">载入预设</button><button :disabled="busy" @click="documents.saveCurrent('preset')">保存预设</button></div><input ref="projectInput" class="file-input" data-testid="project-file" type="file" accept=".json,application/json" @change="documents.selected($event,'project')"/><input ref="presetInput" class="file-input" data-testid="preset-file" type="file" accept=".json,application/json" @change="documents.selected($event,'preset')"/></header></template>
