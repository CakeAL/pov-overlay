<script setup lang="ts">
import CanvasToolbar from "./CanvasToolbar.vue";
import PreviewCanvas from "./PreviewCanvas.vue";
import VideoTransport from "./VideoTransport.vue";
</script>

<template>
  <section class="canvas-workspace">
    <CanvasToolbar />

    <PreviewCanvas />

    <VideoTransport />
  </section>
</template>
