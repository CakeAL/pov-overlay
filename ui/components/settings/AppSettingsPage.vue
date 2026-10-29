<script setup lang="ts">
import HNumberInput from "@celestia-island/hikari/components/HkNumberInput.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { useEditorContext } from '../../editor/context';
import { MAP_PROVIDERS } from '../../domain/appSettings';
import ApiKeySetting from './ApiKeySetting.vue';
import FfmpegSetting from './FfmpegSetting.vue';
const { appSettings } = useEditorContext();
const size = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
</script>
<template>
  <main class="app-settings-page" aria-label="应用设置">
    <header class="preferences-header"><HButton variant="ghost" size="sm" :disabled="appSettings.busy" @click="appSettings.close">← 返回编辑器</HButton><h1>设置</h1></header>
    <div class="preferences-content" :aria-busy="appSettings.busy">
      <FfmpegSetting v-if="appSettings.loaded && !appSettings.busy" />
      <fieldset :disabled="appSettings.busy" @change="appSettings.flush"><h2>地图</h2>
        <label class="preferences-row">新元素默认来源<HSelect panel-title="默认地图来源" v-model="appSettings.draft.defaultMapProvider" :disabled="appSettings.busy" :options="MAP_PROVIDERS.map(provider => ({ value: provider.value, label: provider.label }))" @update:model-value="appSettings.flush" /></label>
        <label class="preferences-row">拖动加载延迟（毫秒）<HNumberInput aria-label="地图加载延迟" :min="50" :max="1500" :step="10" :model-value="appSettings.draft.mapDebounceMs" @update:model-value="appSettings.draft.mapDebounceMs = Number($event)" /></label>
        <label class="preferences-row">瓦片请求并发<HNumberInput aria-label="瓦片请求并发" :min="1" :max="4" :model-value="appSettings.draft.mapConcurrentRequests" @update:model-value="appSettings.draft.mapConcurrentRequests = Number($event)" /></label>
        <label class="preferences-row">高德网络请求间隔（毫秒）<HNumberInput aria-label="高德请求间隔" :min="250" :max="5000" :step="50" :model-value="appSettings.draft.amapMinIntervalMs" @update:model-value="appSettings.draft.amapMinIntervalMs = Number($event)" /></label>
      </fieldset>
      <fieldset :disabled="appSettings.busy" @change="appSettings.flush"><h2>道路信息</h2>
        <label class="preferences-row">逆地理编码间隔（秒）<HNumberInput aria-label="逆地理编码间隔（秒）" :min="1" :max="300" :step="1" :model-value="appSettings.draft.locationRefreshSeconds" @update:model-value="appSettings.draft.locationRefreshSeconds = Number($event)" /></label>
        <p class="settings-note">默认 5 秒，最短 1 秒；按轨迹时间更新，预览与导出共用，已缓存位置不重复请求。</p>
      </fieldset>
      <section class="preferences-section" aria-label="API Key"><h2>API Key</h2>
        <p v-if="!appSettings.native" class="settings-note">API Key 与磁盘缓存请在桌面应用中配置。</p>
        <ApiKeySetting provider="amap" label="高德 Web 服务（地图与逆地理编码）" url="https://lbs.amap.com/api/webservice/guide/api/georegeo" />
      </section>
      <fieldset :disabled="appSettings.busy" @change="appSettings.flush"><h2>缓存</h2>
        <label class="preferences-row">高德静态图缓存（天）<HNumberInput aria-label="静态图缓存天数" :min="1" :max="365" :model-value="appSettings.draft.amapCacheDays" @update:model-value="appSettings.draft.amapCacheDays = Number($event)" /></label>
        <label class="preferences-row">磁盘缓存上限（MB）<HNumberInput aria-label="缓存容量上限" :min="64" :max="8192" :step="64" :model-value="appSettings.draft.cacheLimitMb" @update:model-value="appSettings.draft.cacheLimitMb = Number($event)" /></label>
        <div v-if="appSettings.native" class="cache-summary"><span>{{ size(appSettings.cache.bytes) }} · {{ appSettings.cache.files }} 个文件</span><div><HButton variant="ghost" size="sm" @click="appSettings.openCacheFolder">打开文件夹</HButton><HButton variant="ghost" size="sm" @click="appSettings.clearCache">清空缓存</HButton></div><code>{{ appSettings.cache.path }}</code></div>
        <p class="settings-note">底图、静态图、地址和海拔共用容量上限；网络异常时优先使用已有缓存。</p>
      </fieldset>
      <section class="preferences-section provider-links"><h2>数据来源</h2><HButton variant="ghost" size="sm" @click="appSettings.openUrl('https://www.openstreetmap.org/copyright')">OpenStreetMap ↗</HButton><HButton variant="ghost" size="sm" @click="appSettings.openUrl('https://lbs.amap.com/')">高德地图 ↗</HButton><HButton variant="ghost" size="sm" @click="appSettings.openUrl('https://mapterhorn.com/')">Mapterhorn 海拔 ↗</HButton></section>
    </div>
  </main>
</template>
