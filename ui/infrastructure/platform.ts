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

export async function showSvgSource(source: string, label: string, origin: { sourcePath?: string; exampleKey?: string } = {}) {
  if (native) { await invoke('reveal_svg_source', { source, label, ...origin }); return; }
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
  const link = document.createElement('a'); link.href = url; link.download = label.endsWith('.svg') ? label : `${label}.svg`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
