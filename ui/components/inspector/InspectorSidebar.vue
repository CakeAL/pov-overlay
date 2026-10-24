<script setup lang="ts">
import AssetPanel from "./AssetPanel.vue";
import SyncPanel from "./SyncPanel.vue";
import LayerPanel from "./LayerPanel.vue";
import WidgetPropertiesPanel from "./WidgetPropertiesPanel.vue";
</script>

<template>
  <aside class="inspector">
    <div class="inspector-heading">
      <div>
        <p class="eyebrow">YOUR RIDE, YOUR FRAME</p>
        <h1>让轨迹进入画面</h1>
      </div>
      <span class="version-tag">BETA 01</span>
    </div>
    <div class="inspector-scroll">
      <AssetPanel />

      <SyncPanel />

      <LayerPanel />

      <WidgetPropertiesPanel />
    </div>
    <div class="inspector-footer">
      <span class="tiny-dot"></span><span>每一段旅程，都有自己的坐标。</span>
    </div>
  </aside>
</template>
