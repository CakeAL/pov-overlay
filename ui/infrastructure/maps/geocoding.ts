import { invoke } from '@tauri-apps/api/core';
import { native } from '../media';
import { locationKey, locationQuery, type LocationAddress, type LocationQuery } from '../../domain/location';
import type { Sample } from '../../domain/types';
import type { OverlayContext } from '../../domain/overlayContext';
import { mapRuntimeSettings } from './runtime';
import { MapRequestCache } from './requestCache';
const cache = new MapRequestCache<LocationAddress>(2048, () => 1, () => Math.max(500, mapRuntimeSettings().amapMinIntervalMs));
let generation = 0, failure: { reason: unknown; until: number } | undefined;
export function clearLocationCache() { generation++; cache.clear(); failure = undefined; }
export function retryLocation() { failure = undefined; }
export function lookupLocation(query: LocationQuery, signal?: AbortSignal): Promise<LocationAddress> {
  return cache.get(locationKey(query), async () => {
    if (!native) throw new Error('地点名称请在桌面应用中配置高德 Web 服务 Key 后使用。');
    if (failure && failure.until > Date.now()) throw failure.reason;
    const current = generation;
    try { return await invoke<LocationAddress>('lookup_location', { query }); }
    catch (reason) { if (current === generation) failure = { reason, until: Date.now() + 5000 }; throw reason; }
  }, signal);
}
export async function addressForFrame(sample: Sample | null, context: OverlayContext, signal?: AbortSignal) {
  const query = locationQuery(sample, context);
  return query ? lookupLocation(query, signal) : null;
}
