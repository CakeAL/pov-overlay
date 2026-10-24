<script setup lang="ts">
import { Layers, Undo2, Redo2, RotateCcw, ScanLine } from "lucide-vue-next";
import HSwitch from "@celestia-island/hikari/components/HkSwitch.tsx";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
const { media, playback, layout } = useEditorContext();
const { asset } = toRefs(media);
const { sourceSize } = toRefs(playback);
const { undoStack, redoStack, showSafeArea, snapEnabled } = toRefs(layout);
const { undo, redo, resetLayout } = layout;
</script>

<template>
  <div class="canvas-topbar">
    <div class="canvas-heading">
      <span class="canvas-heading-icon"><Layers :size="18" /></span>
      <h2>预览画布</h2>
    </div>
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
  <div class="canvas-options">
    <span class="aspect-label"
      ><ScanLine :size="14" />
      {{
        asset && sourceSize.width
          ? `${sourceSize.width} × ${sourceSize.height}`
          : "16 : 9"
      }}
      <span>·</span> 自适应</span
    >
    <div>
      <label
        ><HSwitch v-model="showSafeArea" size="sm" label="安全边距" /></label
      ><label
        ><HSwitch v-model="snapEnabled" size="sm" label="智能吸附"
      /></label>
    </div>
  </div>
</template>
