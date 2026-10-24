<script setup lang="ts">
import TelemetryPanel from "./TelemetryPanel.vue";
import AssetPanel from "./AssetPanel.vue";
import SyncPanel from "./SyncPanel.vue";
import LayerPanel from "./LayerPanel.vue";
import WidgetPropertiesPanel from "./WidgetPropertiesPanel.vue";
</script>

<template>
  <aside class="inspector">
    <div class="inspector-scroll">
      <AssetPanel />

      <SyncPanel />

      <TelemetryPanel />
      <LayerPanel />

      <WidgetPropertiesPanel />
    </div>
  </aside>
</template>
