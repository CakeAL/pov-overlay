import { invoke } from '@tauri-apps/api/core';
import { native } from '../media';
const cache = new Map<string, Promise<string>>();
export function amapKeyStatus() { return native ? invoke<boolean>('amap_key_status') : Promise.resolve(false); }
export async function configureAmap(key: string) {
  if (!native) throw new Error('高德地图 Key 请在桌面版配置。');
  await invoke('configure_amap_key', { key }); cache.clear(); window.dispatchEvent(new Event('pov-amap-configured'));
}
export function amapImage(location: { latitude: number; longitude: number; zoom: number }) {
  if (!native) return Promise.reject(new Error('高德地图请在桌面版配置 Web 服务 Key。'));
  const key = `${location.zoom}/${location.latitude.toFixed(6)}/${location.longitude.toFixed(6)}`;
  let result = cache.get(key);
  if (!result) {
    result = invoke<string>('load_amap_map', location).catch(reason => { cache.delete(key); throw reason; });
    cache.set(key, result);
    if (cache.size > 96) cache.delete(cache.keys().next().value!);
  }
  return result;
}
