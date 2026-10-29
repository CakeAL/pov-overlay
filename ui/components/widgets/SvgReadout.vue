<script setup lang="ts">
import { computed, toRefs, toRef } from "vue";
import type { Sample, Widget } from "../../domain/types";
import { widgetSvg, svgDataUrl } from "../../domain/widgetSvg";
import { useEditorContext } from "../../editor/context";
import { useRoadBadge } from "../../composables/useRoadBadge";
const props = defineProps<{ widget: Widget; sample: Sample | null }>();
const { playback, timeline, locationLabels, messages } = useEditorContext();
const { currentTime, ratio } = toRefs(playback);
const badge = useRoadBadge(
  toRef(props, "widget"),
  toRef(locationLabels, "address"),
  messages.report,
);
const url = computed(() =>
  svgDataUrl(
    widgetSvg(props.widget, props.sample, currentTime.value, ratio.value, {
      ...timeline.context,
      address: locationLabels.address,
      roadBadge: badge.value,
    }),
  ),
);
</script>
<template>
  <img class="svg-readout" :src="url" :alt="widget.label" draggable="false" />
</template>
