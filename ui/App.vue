<script setup lang="ts">
import { toRefs } from "vue";
import { provideEditor } from "./editor/context";
import SignMakerPage from "./components/signs/SignMakerPage.vue";
import AppSettingsPage from "./components/settings/AppSettingsPage.vue";
import ExportDialog from "./components/export/ExportDialog.vue";
import SavePresetDialog from "./components/shell/SavePresetDialog.vue";
import DocumentLibrary from "./components/shell/DocumentLibrary.vue";
import AppHeader from "./components/shell/AppHeader.vue";
import Notifications from "./components/shell/Notifications.vue";
import SettingsSidebar from "./components/inspector/SettingsSidebar.vue";
import InspectorSidebar from "./components/inspector/InspectorSidebar.vue";
import PreviewWorkspace from "./components/canvas/PreviewWorkspace.vue";

const { drop, appSettings, signMaker } = provideEditor();
const { dropActive } = toRefs(drop);
</script>

<template>
  <div
    class="app-shell"
    @dragover.prevent="dropActive = !appSettings.pageOpen && !signMaker.pageOpen"
    @dragleave.prevent="dropActive = false"
    @drop.prevent="!appSettings.pageOpen && !signMaker.pageOpen && drop.dropped($event)"
  >
    <AppHeader v-show="!appSettings.pageOpen && !signMaker.pageOpen" />
    <ExportDialog />
    <DocumentLibrary />
    <SavePresetDialog />
    <Notifications />
    <AppSettingsPage v-if="appSettings.pageOpen" />
    <SignMakerPage v-else-if="signMaker.pageOpen" />
    <main v-show="!appSettings.pageOpen && !signMaker.pageOpen" class="workspace"><InspectorSidebar /><PreviewWorkspace /><SettingsSidebar /></main>
  </div>
</template>
