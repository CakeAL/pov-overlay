import { invoke } from '@tauri-apps/api/core';
import { native } from '../media';
import type { MapTile } from '../../domain/mapOverlay';
const failures = new Map<string, { until: number; reason: unknown }>();
export function retryMapTiles() { failures.clear(); }
const cache = new Map<string, Promise<string>>();
let active = 0;
const queue: (() => void)[] = [];
async function fetchTile(tile: MapTile): Promise<string> {
  if (active >= 2) await new Promise<void>(resolve => queue.push(resolve));
  else active++;
  try {
    if (native) return await invoke<string>('load_map_tile', { z: tile.z, x: tile.x, y: tile.y });
    const response = await fetch(`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`地图请求失败（${response.status}）`);
    const blob = await response.blob();
    if (blob.size > 4 * 1024 * 1024) throw new Error('地图瓦片过大。');
    return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
  } finally { const next = queue.shift(); if (next) next(); else active--; }
}
export function mapTile(tile: MapTile) {
  const key = `${tile.z}/${tile.x}/${tile.y}`;
  const failed = failures.get(key);
  if (failed && failed.until > Date.now()) return Promise.reject(failed.reason);
  failures.delete(key);
  let request = cache.get(key);
  if (!request) {
    request = fetchTile(tile).catch(reason => { cache.delete(key);
      failures.set(key, { until: Date.now() + 30000, reason });
      if (failures.size > 192) failures.delete(failures.keys().next().value!);
      throw reason; });
    cache.set(key, request);
    if (cache.size > 192) cache.delete(cache.keys().next().value!);
  }
  return request;
}
