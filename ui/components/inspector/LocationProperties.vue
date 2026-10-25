<script setup lang="ts">
import { computed } from 'vue';
import { hasLocationFields } from '../../domain/location';
import { useEditorContext } from '../../editor/context';
const { layout, appSettings, locationLabels } = useEditorContext();
const visible = computed(() => layout.selected && hasLocationFields(layout.selected));
</script>
<template>
  <div v-if="visible" class="location-properties">
    <div class="preferences-row"><button class="text-button" @click="appSettings.openUrl('https://lbs.amap.com/api/webservice/guide/api/georegeo')">高德地图 ↗</button><button class="text-button" @click="appSettings.open">API 设置</button></div>
    <button v-if="locationLabels.error" class="text-button" :title="locationLabels.error" @click="locationLabels.refresh">重试地址查询</button>
    <span v-else-if="locationLabels.loading" class="muted" role="status">查询中…</span>
  </div>
</template>
