<script setup lang="ts">
import { ChevronRight, ShieldCheck } from "lucide-vue-next";
</script>

<template>
  <header class="app-header">
    <a class="brand" href="#" aria-label="POV Overlay 首页" @click.prevent
      ><span class="brand-mark"
        ><svg viewBox="0 0 24 24" fill="none">
          <path
            d="M6 19V5h8l4 4-4 4H6M11 9h3"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linejoin="round"
          /></svg></span
      ><span
        >pov<span class="brand-light">/</span>overlay<span class="brand-dot"
          >.</span
        ></span
      ></a
    >
    <span class="header-divider"></span
    ><span class="header-workspace"
      >轨迹画布 <ChevronRight :size="13" /> <span>未命名项目</span></span
    >
    <div class="header-actions">
      <span class="local-badge"><ShieldCheck :size="14" /> 本地处理</span>
    </div>
  </header>
</template>
