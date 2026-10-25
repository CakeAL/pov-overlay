<script setup lang="ts">
import AssetPanel from "./AssetPanel.vue";
import SyncPanel from "./SyncPanel.vue";
import LayerPanel from "./LayerPanel.vue";
</script>

<template>
  <aside class="inspector" aria-label="素材与元素">
    <div class="inspector-scroll">
      <AssetPanel />

      <SyncPanel />

      <LayerPanel />
    </div>
  </aside>
</template>
