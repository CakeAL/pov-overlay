<script setup lang="ts">
import WidgetContextMenu from "./WidgetContextMenu.vue";
import CanvasToolbar from "./CanvasToolbar.vue";
import PreviewCanvas from "./PreviewCanvas.vue";
import VideoTransport from "./VideoTransport.vue";
</script>

<template>
  <section class="canvas-workspace">
    <CanvasToolbar />
    <WidgetContextMenu />

    <PreviewCanvas />

    <VideoTransport />
  </section>
</template>
