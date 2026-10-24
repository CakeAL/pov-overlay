import { invoke } from '@tauri-apps/api/core';
import { native } from '../media';
import type { MapTile } from '../../domain/mapOverlay';
const cache = new Map<string, Promise<string>>();
let active = 0;
const queue: (() => void)[] = [];
async function fetchTile(tile: MapTile): Promise<string> {
  if (active >= 2) await new Promise<void>(resolve => queue.push(resolve));
  active++;
  try {
    if (native) return await invoke<string>('load_map_tile', { z: tile.z, x: tile.x, y: tile.y });
    const response = await fetch(`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`地图请求失败（${response.status}）`);
    const blob = await response.blob();
    if (blob.size > 4 * 1024 * 1024) throw new Error('地图瓦片过大。');
    return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
  } finally { active--; queue.shift()?.(); }
}
export function mapTile(tile: MapTile) {
  const key = `${tile.z}/${tile.x}/${tile.y}`;
  let request = cache.get(key);
  if (!request) {
    request = fetchTile(tile).catch(reason => { cache.delete(key); throw reason; });
    cache.set(key, request);
    if (cache.size > 192) cache.delete(cache.keys().next().value!);
  }
  return request;
}
