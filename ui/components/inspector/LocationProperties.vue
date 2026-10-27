<script setup lang="ts">
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { computed } from 'vue';
import { hasLocationFields } from '../../domain/location';
import { useEditorContext } from '../../editor/context';
const { layout, appSettings, locationLabels } = useEditorContext();
const visible = computed(() => layout.selected && hasLocationFields(layout.selected));
</script>
<template>
  <div v-if="visible" class="location-properties">
    <div class="preferences-row"><HButton variant="ghost" size="sm" class="text-button" @click="appSettings.openUrl('https://lbs.amap.com/api/webservice/guide/api/georegeo')">高德地图 ↗</HButton><HButton variant="ghost" size="sm" class="text-button" @click="appSettings.open">API 设置</HButton></div>
    <HButton variant="ghost" size="sm" v-if="locationLabels.error" class="text-button" :title="locationLabels.error" @click="locationLabels.refresh">重试地址查询</HButton>
    <span v-else-if="locationLabels.loading" class="muted" role="status">查询中…</span>
  </div>
</template>
