import { onMounted, reactive, ref } from 'vue';
import { DEFAULT_APP_SETTINGS } from '../domain/appSettings';
import { loadAppSettings, saveAppSettings, setMapApiKey, clearMapCache, openMapCacheFolder, type CacheStats } from '../infrastructure/appSettings';
import { configureMapRuntime } from '../infrastructure/maps/runtime';
import { clearMapTiles } from '../infrastructure/maps/tiles';
import { clearAmapImages } from '../infrastructure/maps/amap';
import { native } from '../infrastructure/media';
import { openExternalUrl } from '../infrastructure/platform';
import type { EditorMessages } from './useMessages';
import type { Playback } from './usePlayback';
export function useAppSettings(messages: EditorMessages, playback: Playback) {
  const pageOpen = ref(false), busy = ref(false), loaded = ref(false);
  const settings = reactive({ ...DEFAULT_APP_SETTINGS }), draft = reactive({ ...settings });
  const configured = reactive({ amap: false });
  const cache = ref<CacheStats>({ bytes: 0, files: 0, path: '' });
  function clearMemory() { clearMapTiles(); clearAmapImages(); }
  async function load() {
    const snapshot = await loadAppSettings();
    Object.assign(settings, snapshot.settings); Object.assign(draft, snapshot.settings);
    configured.amap = snapshot.amapConfigured;
    cache.value = snapshot.cache; loaded.value = true;
    configureMapRuntime(settings, !pageOpen.value);
  }
  // Startup and manual opening share the same load, so late startup IO cannot overwrite edits.
  let initializing: Promise<void>;
  onMounted(() => { initializing = load().catch(reason => messages.report(reason)); });
  async function open() {
    playback.video.value?.pause(); playback.playing.value = false;
    pageOpen.value = true; busy.value = true;
    try { await initializing; await load(); } catch (reason) { messages.report(reason); }
    finally { busy.value = false; }
  }
  function close() {
    pageOpen.value = false;
    // Refresh hidden editor maps only when returning to the editor.
    window.dispatchEvent(new Event('pov-map-settings-changed'));
  }
  async function save() {
    busy.value = true;
    try {
      await saveAppSettings({ ...draft }); Object.assign(settings, draft);
      configureMapRuntime(settings, false);
      messages.notice.value = '设置已保存。';
    } catch (reason) { messages.report(reason); }
    finally { busy.value = false; }
  }
  async function saveKey(provider: 'amap', key: string | null) {
    busy.value = true;
    try {
      await setMapApiKey(provider, key); configured[provider] = key !== null;
      clearMemory(); messages.notice.value = key === null ? 'Key 已删除。' : 'Key 已保存。';
      return true;
    } catch (reason) { messages.report(reason); return false; }
    finally { busy.value = false; }
  }
  async function clearCache() {
    busy.value = true; clearMemory();
    try { cache.value = await clearMapCache(); clearMemory(); messages.notice.value = '地图缓存已清空。'; }
    catch (reason) { messages.report(reason); }
    finally { busy.value = false; }
  }
  async function openCacheFolder() { try { await openMapCacheFolder(); } catch (reason) { messages.report(reason); } }
  async function openUrl(url: string) { try { await openExternalUrl(url); } catch (reason) { messages.report(reason); } }
  return { pageOpen, busy, loaded, settings, draft, configured, cache, native, open, close, save, saveKey, clearCache, openCacheFolder, openUrl };
}
