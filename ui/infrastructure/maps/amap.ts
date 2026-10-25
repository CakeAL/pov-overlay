import { invoke } from '@tauri-apps/api/core';
import { native } from '../media';
let generation = 0;
let failure: { until: number; reason: unknown } | null = null;
export function retryAmap() { failure = null; }
const cache = new Map<string, Promise<string>>();
export function amapKeyStatus() { return native ? invoke<boolean>('amap_key_status') : Promise.resolve(false); }
export async function configureAmap(key: string) {
  if (!native) throw new Error('高德地图 Key 请在桌面版配置。');
  await invoke('configure_amap_key', { key }); cache.clear(); generation++; retryAmap(); window.dispatchEvent(new Event('pov-amap-configured'));
}
export function amapImage(location: { latitude: number; longitude: number; zoom: number }) {
  if (!native) return Promise.reject(new Error('高德地图请在桌面版配置 Web 服务 Key。'));
  if (failure && failure.until > Date.now()) return Promise.reject(failure.reason);
  const key = `${location.zoom}/${location.latitude.toFixed(6)}/${location.longitude.toFixed(6)}`;
  let result = cache.get(key);
  if (!result) {
    const current = generation;
    result = invoke<string>('load_amap_map', location).catch(reason => { if (current === generation) { cache.delete(key); failure = { until: Date.now() + 30000, reason }; } throw reason; });
    cache.set(key, result);
    if (cache.size > 96) cache.delete(cache.keys().next().value!);
  }
  return result;
}
