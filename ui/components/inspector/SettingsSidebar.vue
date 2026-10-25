<script setup lang="ts">
import WidgetPropertiesPanel from './WidgetPropertiesPanel.vue';
import TelemetryPanel from './TelemetryPanel.vue';
</script>
<template>
  <aside class="properties-inspector" aria-label="元素与采样设置">
    <div class="inspector-scroll"><WidgetPropertiesPanel /><TelemetryPanel /></div>
  </aside>
</template>
