<script setup lang="ts">
import { Undo2, Redo2, RotateCcw } from "lucide-vue-next";
import CanvasZoomControls from "./CanvasZoomControls.vue";
import HSwitch from "@celestia-island/hikari/components/HkSwitch.tsx";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
const { layout } = useEditorContext();
const { undoStack, redoStack, showSafeArea, snapEnabled } = toRefs(layout);
const { undo, redo, resetLayout } = layout;
</script>

<template>
  <div class="canvas-topbar">
    <CanvasZoomControls />
    <div class="canvas-switches"><HSwitch v-model="showSafeArea" size="sm" label="边距" /><span title="对齐画布或其他元素；按 Alt 临时关闭吸附。"><HSwitch v-model="snapEnabled" size="sm" label="吸附" /></span></div>
    <div class="canvas-actions">
      <button
        class="icon-button"
        aria-label="撤销"
        title="撤销 ⌘Z"
        :disabled="!undoStack.length"
        @click="undo"
      >
        <Undo2 :size="16" /></button
      ><button
        class="icon-button"
        aria-label="重做"
        title="重做 ⇧⌘Z"
        :disabled="!redoStack.length"
        @click="redo"
      >
        <Redo2 :size="16" /></button
      ><span class="action-divider"></span
      ><button class="text-button" @click="resetLayout">
        <RotateCcw :size="14" /> 重置布局
      </button>
    </div>
  </div>
</template>
