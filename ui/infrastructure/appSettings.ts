import { invoke } from '@tauri-apps/api/core';
import { native } from './media';
import { DEFAULT_APP_SETTINGS, validateAppSettings, type AppSettings } from '../domain/appSettings';
export interface CacheStats { bytes: number; files: number; path: string }
export interface SettingsSnapshot { settings: AppSettings; amapConfigured: boolean; cartoConfigured: boolean; cache: CacheStats }
const browserKey = 'pov-app-settings';
export async function loadAppSettings(): Promise<SettingsSnapshot> {
  if (native) return invoke('load_app_settings');
  const stored = localStorage.getItem(browserKey);
  const settings = stored ? validateAppSettings({ ...DEFAULT_APP_SETTINGS, ...JSON.parse(stored) }) : { ...DEFAULT_APP_SETTINGS };
  return { settings, amapConfigured: false, cartoConfigured: false, cache: { bytes: 0, files: 0, path: '' } };
}
export async function saveAppSettings(value: AppSettings) {
  const settings = validateAppSettings(value);
  if (native) await invoke('save_app_settings', { settings });
  else localStorage.setItem(browserKey, JSON.stringify(settings));
}
export async function setMapApiKey(provider: 'amap' | 'carto', key: string | null) {
  if (!native) throw new Error('请在桌面应用中配置 API Key。');
  await invoke('set_map_api_key', { provider, key });
}
export const clearMapCache = () => invoke<CacheStats>('clear_map_cache');
export const openMapCacheFolder = () => invoke('open_map_cache_folder');
