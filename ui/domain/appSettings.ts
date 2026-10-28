export const MAP_PROVIDERS = [
  { value: 'osm', label: 'OpenStreetMap', url: 'https://www.openstreetmap.org/' },
  { value: 'amap', label: '高德地图', url: 'https://lbs.amap.com/api/webservice/guide/api/staticmaps' },
] as const;
export type MapProvider = typeof MAP_PROVIDERS[number]['value'];
export interface AppSettings {
  defaultMapProvider: MapProvider;
  mapDebounceMs: number;
  mapConcurrentRequests: number;
  amapMinIntervalMs: number;
  locationRefreshSeconds: number;
  amapCacheDays: number;
  cacheLimitMb: number;
}
export const DEFAULT_APP_SETTINGS: AppSettings = { defaultMapProvider: 'osm', mapDebounceMs: 180, mapConcurrentRequests: 2, amapMinIntervalMs: 500, locationRefreshSeconds: 5, amapCacheDays: 30, cacheLimitMb: 512 };
export const isMapProvider = (value: unknown): value is MapProvider => MAP_PROVIDERS.some(item => item.value === value);
export function validateAppSettings(value: AppSettings): AppSettings {
  if (!isMapProvider(value.defaultMapProvider)) throw new Error('地图来源无效。');
  const limits = { mapDebounceMs: [50, 1500], mapConcurrentRequests: [1, 4], amapMinIntervalMs: [250, 5000], amapCacheDays: [1, 365], cacheLimitMb: [64, 8192] } as const;
  for (const [key, [min, max]] of Object.entries(limits)) {
    const number = value[key as keyof typeof limits];
    if (!Number.isInteger(number) || number < min || number > max) throw new Error('设置值超出允许范围。');
  }
  if (!Number.isFinite(value.locationRefreshSeconds) || value.locationRefreshSeconds < 1 || value.locationRefreshSeconds > 300) throw new Error('逆地理编码间隔须为 1–300 秒。');
  return { ...value };
}
