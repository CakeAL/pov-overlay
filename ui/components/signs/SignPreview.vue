<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useEditorContext } from "../../editor/context";
import { svgDataUrl } from "../../domain/widgetSvg";
import { useSignTextPointer } from "../../composables/useSignTextPointer";
const props = defineProps<{ editing: boolean }>();
const { signMaker: maker } = useEditorContext();
const overlay = ref<SVGSVGElement | null>(null);
const pointer = useSignTextPointer();
watch(
  () => props.editing,
  () => pointer.end(),
);
const ratio = computed(() =>
  maker.artwork ? maker.artwork.width / maker.artwork.height : 1,
);
function start(event: PointerEvent, key: string, resize = false) {
  if (!props.editing || event.button !== 0 || !overlay.value || !maker.artwork)
    return;
  const item = maker.artwork.texts.find((t) => t.key === key);
  if (!item) return;
  event.preventDefault();
  event.stopPropagation();
  maker.textEditing.select(key);
  overlay.value.focus();
  overlay.value.setPointerCapture?.(event.pointerId);
  pointer.begin(
    item,
    resize,
    event.clientX,
    event.clientY,
    overlay.value.getBoundingClientRect(),
    maker.artwork,
  );
}
function move(event: PointerEvent) {
  const edit = pointer.move(event.clientX, event.clientY);
  if (edit) maker.textEditing.move(edit.key, edit.x, edit.y, edit.scale);
}
function keydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    pointer.end();
    maker.textEditing.select("");
    return;
  }
  const direction = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }[event.key];
  const item = maker.textEditing.selected;
  if (!direction || !item) return;
  event.preventDefault();
  event.stopPropagation();
  const step = (event.shiftKey ? 10 : 1) / maker.textEditing.ratio;
  maker.textEditing.move(
    item.key,
    item.bounds.x + direction[0]! * step,
    item.bounds.y + direction[1]! * step,
  );
}
</script>
<template>
  <div class="sign-maker-preview-stage">
    <div
      v-if="maker.artwork"
      class="sign-artwork"
      :style="{
        width: `min(${maker.zoom}%, calc(var(--sign-preview-height) * ${(ratio * maker.zoom) / 100}))`,
        aspectRatio: String(ratio),
      }"
      @pointerdown="maker.textEditing.select('')"
    >
      <img
        :src="svgDataUrl(maker.source)"
        alt="道路交通牌预览"
        draggable="false"
      />
      <svg
        v-if="editing"
        ref="overlay"
        class="sign-text-overlay"
        :viewBox="`0 0 ${maker.artwork.width} ${maker.artwork.height}`"
        tabindex="0"
        aria-label="标牌文字编辑区"
        @pointermove="move"
        @pointerup="pointer.end"
        @pointercancel="pointer.end"
        @lostpointercapture="pointer.end"
        @keydown="keydown"
      >
        <rect
          v-for="item in maker.artwork.texts"
          :key="item.key"
          class="sign-text-hit"
          :class="{ 'is-selected': maker.textEditing.selectedKey === item.key }"
          :x="item.bounds.x"
          :y="item.bounds.y"
          :width="Math.max(item.bounds.width, 4)"
          :height="Math.max(item.bounds.height, 4)"
          :data-text-key="item.key"
          :aria-label="`移动文字 ${item.label}`"
          @pointerdown="start($event, item.key)"
        />
        <rect
          v-if="maker.textEditing.selected"
          class="sign-text-resize"
          :x="
            maker.textEditing.selected.bounds.x +
            maker.textEditing.selected.bounds.width -
            4
          "
          :y="
            maker.textEditing.selected.bounds.y +
            maker.textEditing.selected.bounds.height -
            4
          "
          width="8"
          height="8"
          aria-label="调整文字大小"
          @pointerdown="start($event, maker.textEditing.selected!.key, true)"
        />
      </svg>
    </div>
    <p v-else-if="maker.loading" role="status">正在生成标牌…</p>
    <p v-else-if="maker.error" role="alert">{{ maker.error }}</p>
  </div>
</template>
