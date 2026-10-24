<script setup lang="ts">
import { toRefs } from "vue";
import { provideEditor } from "./editor/context";
import AppHeader from "./components/shell/AppHeader.vue";
import StatusBanner from "./components/shell/StatusBanner.vue";
import InspectorSidebar from "./components/inspector/InspectorSidebar.vue";
import PreviewWorkspace from "./components/canvas/PreviewWorkspace.vue";

const { messages, drop } = provideEditor();
const { error, notice } = toRefs(messages);
const { dropActive } = toRefs(drop);
</script>

<template>
  <div
    class="app-shell"
    @dragover.prevent="dropActive = true"
    @dragleave.prevent="dropActive = false"
    @drop.prevent="drop.dropped"
  >
    <AppHeader />
    <StatusBanner kind="error" :message="error" @close="error = ''" />
    <StatusBanner kind="notice" :message="notice" @close="notice = ''" />
    <main class="workspace"><InspectorSidebar /><PreviewWorkspace /></main>
  </div>
</template>
