<script setup lang="ts">
import { ref } from 'vue';
import { useEditorContext } from '../../editor/context';
const props = defineProps<{ provider: 'amap' | 'carto'; label: string; url: string }>();
const { appSettings } = useEditorContext();
const key = ref('');
async function save() { if (await appSettings.saveKey(props.provider, key.value.trim())) key.value = ''; }
async function remove() { if (await appSettings.saveKey(props.provider, null)) key.value = ''; }
</script>
<template>
  <div class="api-key-setting">
    <div class="preferences-row"><label :for="`${provider}-api-key`">{{ label }}</label><span>{{ appSettings.configured[provider] ? '已配置' : '未配置' }}</span><button class="settings-link" @click="appSettings.openUrl(url)">获取 Key ↗</button></div>
    <div class="api-key-input"><input :id="`${provider}-api-key`" v-model="key" type="password" :aria-label="`${label} Key`" autocomplete="new-password" :placeholder="appSettings.configured[provider] ? '输入新 Key 替换' : 'API Key'" :disabled="!appSettings.native || appSettings.busy" /><button :disabled="!appSettings.native || appSettings.busy || !key.trim()" @click="save">保存</button><button :disabled="appSettings.busy || !appSettings.configured[provider]" @click="remove">删除</button></div>
  </div>
</template>
