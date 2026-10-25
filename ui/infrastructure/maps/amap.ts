import { invoke } from '@tauri-apps/api/core';
import { native } from '../media';
import { MapRequestCache } from './requestCache';
import { mapRuntimeSettings } from './runtime';
let generation = 0;
let failure: { until: number; reason: unknown } | null = null;
export function retryAmap() { failure = null; }
const cache = new MapRequestCache<string>(128, () => 1, () => mapRuntimeSettings().amapMinIntervalMs);
interface Location { latitude: number; longitude: number; zoom: number }
export const amapImageKey = (location: Location) => `${location.zoom}/${location.latitude.toFixed(6)}/${location.longitude.toFixed(6)}`;
export const amapImageCached = (location: Location) => cache.peek(amapImageKey(location)) !== undefined;
export function clearAmapImages() { cache.clear(); retryAmap(); generation++; }
export function amapImage(location: Location, signal?: AbortSignal) {
  const key = amapImageKey(location);
  return cache.get(key, async () => {
    if (!native) throw new Error('高德地图请在设置中配置 Web 服务 Key。');
    if (failure && failure.until > Date.now()) throw failure.reason;
    const current = generation;
    try { return await invoke<string>('load_amap_map', { ...location }); }
    catch (reason) { if (current === generation) failure = { until: Date.now() + 5000, reason }; throw reason; }
  }, signal);
}
