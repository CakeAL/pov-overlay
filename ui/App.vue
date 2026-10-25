<script setup lang="ts">
import { toRefs } from "vue";
import { provideEditor } from "./editor/context";
import ExportDialog from "./components/export/ExportDialog.vue";
import SavePresetDialog from "./components/shell/SavePresetDialog.vue";
import DocumentLibrary from "./components/shell/DocumentLibrary.vue";
import AppHeader from "./components/shell/AppHeader.vue";
import Notifications from "./components/shell/Notifications.vue";
import SettingsSidebar from "./components/inspector/SettingsSidebar.vue";
import InspectorSidebar from "./components/inspector/InspectorSidebar.vue";
import PreviewWorkspace from "./components/canvas/PreviewWorkspace.vue";

const { drop } = provideEditor();
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
    <ExportDialog />
    <DocumentLibrary />
    <SavePresetDialog />
    <Notifications />
    <main class="workspace"><InspectorSidebar /><PreviewWorkspace /><SettingsSidebar /></main>
  </div>
</template>
