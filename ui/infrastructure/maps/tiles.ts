import { invoke } from '@tauri-apps/api/core';
import { native } from '../media';
import type { MapTile } from '../../domain/mapOverlay';
import { MapRequestCache } from './requestCache';
import { mapRuntimeSettings } from './runtime';
let generation = 0;
const failures = new Map<string, { until: number; reason: unknown }>();
const cache = new MapRequestCache<string>(256, () => mapRuntimeSettings().mapConcurrentRequests);
const keyOf = (tile: MapTile) => `${tile.provider ?? "osm"}/${tile.z}/${tile.x}/${tile.y}`;
export function retryMapTiles() { failures.clear(); }
export function clearMapTiles() { generation++; failures.clear(); cache.clear(); }
export const mapTileCached = (tile: MapTile) => cache.peek(keyOf(tile)) !== undefined;
async function fetchTile(tile: MapTile): Promise<string> {
  if (native) return invoke<string>('load_map_tile', { provider: tile.provider ?? 'osm', z: tile.z, x: tile.x, y: tile.y });
  if (tile.provider && tile.provider !== 'osm') throw new Error('不支持此地图来源。');
  const response = await fetch(`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`, { cache: 'force-cache', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`地图请求失败（${response.status}）`);
  const blob = await response.blob();
  if (blob.size > 4 * 1024 * 1024) throw new Error('地图瓦片过大。');
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
}
export function mapTile(tile: MapTile, signal?: AbortSignal) {
  const key = keyOf(tile);
  return cache.get(key, async () => {
    const failed = failures.get(key);
    if (failed && failed.until > Date.now()) throw failed.reason;
    const current = generation;
    try { const value = await fetchTile(tile); failures.delete(key); return value; }
    catch (reason) { if (current === generation) failures.set(key, { until: Date.now() + 5000, reason }); if (failures.size > 256) failures.delete(failures.keys().next().value!); throw reason; }
  }, signal);
}
