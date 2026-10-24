<script setup lang="ts">
import { computed, toRefs } from "vue";
import type { Sample, Widget } from "../../domain/types";
import { bindSvg } from "../../domain/svgBindings";
import { useEditorContext } from "../../editor/context";
const props = defineProps<{ widget: Widget; sample: Sample | null }>();
const { playback } = useEditorContext();
const { currentTime } = toRefs(playback);
const url = computed(
  () =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(bindSvg(props.widget.svg?.source ?? "", props.sample, currentTime.value, props.widget.color))}`,
);
</script>
<template>
  <img class="svg-readout" :src="url" :alt="widget.label" draggable="false" />
</template>
