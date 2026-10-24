import { invoke } from '@tauri-apps/api/core';
import { native } from '../media';
export interface ElevationPoint { latitude: number; longitude: number }
export async function sampleTerrainTile(x: number, y: number, points: ElevationPoint[]): Promise<(number | null)[]> {
  if (!native) throw new Error('海拔补全请在桌面应用中使用。');
  const values = await invoke<(number | null)[]>('sample_terrain_tile', { z: 12, x, y, points });
  if (values.length !== points.length || values.some(value => value != null && !Number.isFinite(value))) throw new Error('海拔数据响应无效。');
  return values;
}
