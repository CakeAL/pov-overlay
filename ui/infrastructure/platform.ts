import { invoke } from '@tauri-apps/api/core';
import { native } from './media';
export async function openPresetFolder() {
  if (!native) throw new Error('打开预设文件夹请在桌面应用中使用。');
  await invoke('open_preset_folder');
}
export async function openExternalUrl(url: string) {
  if (native) await invoke('open_external_url', { url });
  else window.open(url, '_blank', 'noopener,noreferrer');
}
