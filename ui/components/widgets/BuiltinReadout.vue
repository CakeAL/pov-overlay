<script setup lang="ts">
import { computed, toRefs } from "vue";
import type { Sample, Widget } from "../../domain/types";
import { widgetSvg, svgDataUrl } from "../../domain/widgetSvg";
import { useEditorContext } from "../../editor/context";
const props = defineProps<{ widget: Widget; sample: Sample | null }>();
const { playback } = useEditorContext();
const { ratio, currentTime } = toRefs(playback);
const url = computed(() => svgDataUrl(widgetSvg(props.widget, props.sample, currentTime.value, ratio.value)));
</script>
<template>
  <img class="builtin-readout" :src="url" :alt="widget.label" draggable="false" />
</template>
