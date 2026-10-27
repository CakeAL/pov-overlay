<script setup lang="ts">
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import type { Widget, Sample } from '../../domain/types';
import { useEditorContext } from '../../editor/context';
import { useMapPreview } from '../../composables/useMapPreview';
const props = defineProps<{ widget: Widget; sample: Sample | null }>();
const { timeline, appSettings } = useEditorContext();
const { url, error, loading, refresh } = useMapPreview(() => ({ widget: props.widget, sample: props.sample, context: timeline.context }), () => !appSettings.pageOpen);
</script>
<template>
  <img v-if="url" class="builtin-readout" :src="url" alt="小地图" draggable="false" />
  <div v-if="!url" class="map-status"><span>{{ error ? '地图加载失败' : '加载地图…' }}</span><HButton variant="ghost" size="sm" v-if="error" :title="error" @pointerdown.stop @click.stop="refresh">重试</HButton></div>
  <span v-else-if="loading" class="map-loading" role="status">加载中…</span>
  <HButton variant="ghost" size="sm" v-else-if="error" class="map-retry" :title="error" @pointerdown.stop @click.stop="refresh">重试地图</HButton>
</template>
