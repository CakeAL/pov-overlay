<script setup lang="ts">
import { useEditorContext } from '../../editor/context';
import { MAP_PROVIDERS } from '../../domain/appSettings';
import ApiKeySetting from './ApiKeySetting.vue';
const { appSettings } = useEditorContext();
const size = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
</script>
<template>
  <main class="app-settings-page" aria-label="应用设置">
    <header class="preferences-header"><button :disabled="appSettings.busy" @click="appSettings.close">← 返回编辑器</button><h1>设置</h1></header>
    <div class="preferences-content" :aria-busy="appSettings.busy">
      <fieldset :disabled="appSettings.busy" @change="appSettings.flush"><h2>地图</h2>
        <label class="preferences-row">新元素默认来源<select aria-label="默认地图来源" v-model="appSettings.draft.defaultMapProvider"><option v-for="provider in MAP_PROVIDERS" :key="provider.value" :value="provider.value">{{ provider.label }}</option></select></label>
        <label class="preferences-row">拖动加载延迟（毫秒）<input aria-label="地图加载延迟" type="number" min="50" max="1500" step="10" v-model.number="appSettings.draft.mapDebounceMs" /></label>
        <label class="preferences-row">瓦片请求并发<input aria-label="瓦片请求并发" type="number" min="1" max="4" v-model.number="appSettings.draft.mapConcurrentRequests" /></label>
        <label class="preferences-row">高德请求间隔（毫秒）<input aria-label="高德请求间隔" type="number" min="250" max="5000" step="50" v-model.number="appSettings.draft.amapMinIntervalMs" /></label>
      </fieldset>
      <section class="preferences-section" aria-label="API Key"><h2>API Key</h2>
        <p v-if="!appSettings.native" class="settings-note">API Key 与磁盘缓存请在桌面应用中配置。</p>
        <ApiKeySetting provider="amap" label="高德 Web 服务" url="https://lbs.amap.com/api/webservice/guide/api/staticmaps" />
      </section>
      <fieldset :disabled="appSettings.busy" @change="appSettings.flush"><h2>缓存</h2>
        <label class="preferences-row">高德静态图缓存（天）<input aria-label="静态图缓存天数" type="number" min="1" max="365" v-model.number="appSettings.draft.amapCacheDays" /></label>
        <label class="preferences-row">磁盘缓存上限（MB）<input aria-label="缓存容量上限" type="number" min="64" max="8192" step="64" v-model.number="appSettings.draft.cacheLimitMb" /></label>
        <div v-if="appSettings.native" class="cache-summary"><span>{{ size(appSettings.cache.bytes) }} · {{ appSettings.cache.files }} 个文件</span><div><button @click="appSettings.openCacheFolder">打开文件夹</button><button @click="appSettings.clearCache">清空缓存</button></div><code>{{ appSettings.cache.path }}</code></div>
        <p class="settings-note">底图、静态图、地址和海拔共用容量上限；网络异常时优先使用已有缓存。</p>
      </fieldset>
      <section class="preferences-section provider-links"><h2>数据来源</h2><button @click="appSettings.openUrl('https://www.openstreetmap.org/copyright')">OpenStreetMap ↗</button><button @click="appSettings.openUrl('https://lbs.amap.com/')">高德地图 ↗</button><button @click="appSettings.openUrl('https://mapterhorn.com/')">Mapterhorn 海拔 ↗</button></section>
    </div>
  </main>
</template>
