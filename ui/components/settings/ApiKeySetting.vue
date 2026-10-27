<script setup lang="ts">
import HInput from "@celestia-island/hikari/components/HkInput.tsx";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { ref } from 'vue';
import { useEditorContext } from '../../editor/context';
const props = defineProps<{ provider: 'amap'; label: string; url: string }>();
const { appSettings } = useEditorContext();
const key = ref('');
async function save() { if (await appSettings.saveKey(props.provider, key.value.trim())) key.value = ''; }
async function remove() { if (await appSettings.saveKey(props.provider, null)) key.value = ''; }
</script>
<template>
  <div class="api-key-setting">
    <div class="preferences-row"><label :for="`${provider}-api-key`">{{ label }}</label><span>{{ appSettings.configured[provider] ? '已配置' : '未配置' }}</span><HButton variant="ghost" size="sm" class="settings-link" @click="appSettings.openUrl(url)">获取 Key ↗</HButton></div>
    <div class="api-key-input"><HInput :id="`${provider}-api-key`" v-model="key" variant="password" :aria-label="`${label} Key`" autocomplete="new-password" :placeholder="appSettings.configured[provider] ? '输入新 Key 替换' : 'API Key'" :disabled="!appSettings.native || appSettings.busy" /><HButton size="sm" :disabled="!appSettings.native || appSettings.busy || !key.trim()" @click="save">保存</HButton><HButton variant="danger" size="sm" :disabled="appSettings.busy || !appSettings.configured[provider]" @click="remove">删除</HButton></div>
  </div>
</template>
