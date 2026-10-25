<script setup lang="ts">
import { computed, toRefs } from "vue";
import type { Sample, Widget } from "../../domain/types";
import { widgetSvg, svgDataUrl } from "../../domain/widgetSvg";
import { useEditorContext } from "../../editor/context";
const props = defineProps<{ widget: Widget; sample: Sample | null }>();
const { playback, timeline, locationLabels } = useEditorContext();
const { currentTime, ratio } = toRefs(playback);
const url = computed(() => svgDataUrl(widgetSvg(props.widget, props.sample, currentTime.value, ratio.value, { ...timeline.context, address: locationLabels.address })));
</script>
<template>
  <img class="svg-readout" :src="url" :alt="widget.label" draggable="false" />
</template>
