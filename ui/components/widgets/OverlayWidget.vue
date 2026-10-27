<script setup lang="ts">
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { LockKeyhole } from "lucide-vue-next";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
import type { Widget, Sample } from "../../domain/types";
import MapReadout from "./MapReadout.vue";
import SvgReadout from "./SvgReadout.vue";
import BuiltinReadout from "./BuiltinReadout.vue";
defineProps<{ widget: Widget; sample: Sample | null }>();
const { layout, widgetMenu } = useEditorContext();
const { selectedId } = toRefs(layout);
const { widgetStyle, startDrag, moveDrag, endDrag } = layout;
</script>

<template>
  <div
    :data-testid="`widget-${widget.id}`"
    class="overlay-widget"
    :class="[
      widget.kind,
      { selected: selectedId === widget.id, locked: widget.locked },
    ]"
    :style="widgetStyle(widget)"
    tabindex="0"
    :aria-label="`${widget.label}组件，可拖动定位`"
    @focus="selectedId = widget.id"
    @contextmenu="widgetMenu.open($event, widget.id)"
    @pointerdown="startDrag($event, widget)"
    @pointermove="moveDrag"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @lostpointercapture="endDrag"
  >
    <span v-if="selectedId === widget.id" class="selection-label"
      >{{ widget.label }} <LockKeyhole v-if="widget.locked" :size="9"
    /></span>
    <MapReadout v-if="widget.kind === 'minimap'" :widget="widget" :sample="sample" />
    <BuiltinReadout
      v-else-if="widget.kind !== 'svg'"
      :widget="widget"
      :sample="sample"
    />
    <SvgReadout v-else :widget="widget" :sample="sample" />
    <template v-if="selectedId === widget.id && !widget.locked"
      ><i class="selection-corner tl"></i><i class="selection-corner tr"></i
      ><i class="selection-corner bl"></i
      ><HButton variant="ghost" size="sm"
        class="resize-handle"
        :aria-label="`缩放${widget.label}`"
        @pointerdown.stop="startDrag($event, widget, 'resize')"
      ></HButton
    ></template>
  </div>
</template>
