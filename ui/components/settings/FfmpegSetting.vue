<script setup lang="ts">
import { onMounted, ref } from 'vue';
import HInput from '@celestia-island/hikari/components/HkInput.tsx';
import HButton from '@celestia-island/hikari/components/HkButton.tsx';
import { useEditorContext } from '../../editor/context';
import { chooseFfmpeg, detectFfmpeg } from '../../infrastructure/appSettings';
const { appSettings, messages } = useEditorContext();
const status = ref(''), checking = ref(false);
async function detect() {
  if (!appSettings.native || checking.value) return;
  checking.value = true;
  try {
    appSettings.draft.ffmpegPath = appSettings.draft.ffmpegPath.trim();
    if (!await appSettings.flush()) return;
    status.value = `当前使用：${(await detectFfmpeg()).path}`;
  } catch (reason) { status.value = String(reason); }
  finally { checking.value = false; }
}
async function browse() {
  try {
    const path = await chooseFfmpeg();
    if (typeof path === 'string') { appSettings.draft.ffmpegPath = path; await detect(); }
  } catch (reason) { messages.report(reason); }
}
onMounted(detect);
</script>
<template>
  <section class="preferences-section"><h2>FFmpeg</h2>
    <div class="api-key-input">
      <HInput aria-label="FFmpeg 可执行文件路径" v-model="appSettings.draft.ffmpegPath" :disabled="!appSettings.native || appSettings.busy" placeholder="留空自动检测，可填写 FFmpeg 完整路径" @change="detect" />
      <HButton variant="outline" :disabled="!appSettings.native || checking" @click="browse">选择文件</HButton>
      <HButton variant="ghost" :disabled="!appSettings.native || checking" @click="detect">{{ checking ? '检测中' : '检测' }}</HButton>
    </div>
    <p class="settings-note">{{ appSettings.native ? status || '路径保存在本机。macOS 自动查找 PATH 与 Homebrew；Windows 可选择 ffmpeg.exe。' : '请在桌面应用中配置 FFmpeg。' }}</p>
  </section>
</template>
