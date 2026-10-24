<script setup lang="ts">
import { MousePointer2 } from "lucide-vue-next";
</script>

<template>
  <footer class="workspace-footer">
    <span
      ><MousePointer2 :size="12" /> 拖动排布
      <span class="footer-separator">/</span> 方向键微调
      <span class="footer-separator">/</span> <kbd>Space</kbd> 播放 / 暂停</span
    ><span><span class="tiny-dot"></span> 仅预览 · 不合成视频</span>
  </footer>
</template>
