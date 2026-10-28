// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { computed, createApp, nextTick, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { DEFAULT_APP_SETTINGS, validateAppSettings } from '../domain/appSettings';
import { loadAppSettings, saveAppSettings } from '../infrastructure/appSettings';
import { configureMapRuntime } from '../infrastructure/maps/runtime';
import { addressForFrame, clearLocationCache } from '../infrastructure/maps/geocoding';
import { useLocationLabels } from '../composables/useLocationLabels';
import type { Timeline } from '../composables/useTimeline';
import type { WidgetLayout } from '../composables/useWidgetLayout';
import type { EditorMessages } from '../composables/useMessages';
import type { Track, Widget } from '../domain/types';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => ({ province: '省', city: '市', district: '区', street: '街道', road: '道路' })) }));
vi.mock('../infrastructure/media', () => ({ native: true }));
const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).forEach(stop => stop()); clearLocationCache(); configureMapRuntime(DEFAULT_APP_SETTINGS, false); vi.useRealTimers(); vi.clearAllMocks(); });

test('preview queries once per five track seconds, export reuses it, and changed settings take effect', async () => {
  vi.useFakeTimers();
  clearLocationCache();
  configureMapRuntime(DEFAULT_APP_SETTINGS, false);
  const track: Track = { name: '', startMs: 100000, endMs: 120000, distanceMeters: 200, skippedPoints: 0, samples: [0, 20].map(t => ({ timestampMs: 100000 + t * 1000, latitude: 22.6 + t * .001, longitude: 113.83, elevation: null, speedMps: 10, distanceMeters: t * 10, segment: 0 })) };
  const timestampMs = ref(track.startMs);
  const sample = ref(track.samples[0]!);
  const context = computed(() => ({ track, timestampMs: timestampMs.value }));
  const widgets = ref([{ kind: 'svg', visible: true, scale: 1, svg: { source: '<svg><text>{$Road}</text></svg>' } } as Widget]);
  let labels!: ReturnType<typeof useLocationLabels>;
  const app = createApp({ setup() { labels = useLocationLabels({ sample, context } as Timeline, { widgets } as WidgetLayout, () => false, { report: vi.fn() } as unknown as EditorMessages); return () => null; } });
  app.mount(document.createElement('div'));
  cleanup.push(() => app.unmount());
  async function seek(seconds: number) { timestampMs.value = track.startMs + seconds * 1000; await nextTick(); await vi.advanceTimersByTimeAsync(600); }
  await seek(0);
  expect(invoke).toHaveBeenCalledTimes(1);
  for (const t of [.2, 1, 2, 3, 4.9]) await seek(t);
  expect(invoke).toHaveBeenCalledTimes(1);
  await seek(5);
  expect(invoke).toHaveBeenCalledTimes(2);
  const query = vi.mocked(invoke).mock.calls[1]![1];
  await addressForFrame(sample.value, { track, timestampMs: 109900 });
  expect(invoke).toHaveBeenCalledTimes(2);
  await seek(1); // Cached earlier bucket.
  expect(invoke).toHaveBeenCalledTimes(2);
  configureMapRuntime({ ...DEFAULT_APP_SETTINGS, locationRefreshSeconds: 1 });
  await nextTick(); await vi.advanceTimersByTimeAsync(600);
  expect(invoke).toHaveBeenCalledTimes(3);
  expect(vi.mocked(invoke).mock.calls[2]![1]).not.toEqual(query);
  timestampMs.value = track.endMs + 1;
  await nextTick(); await vi.advanceTimersByTimeAsync(600);
  expect(labels.address.value).toBeNull();
  expect(invoke).toHaveBeenCalledTimes(3);
  widgets.value = [];
  await seek(15);
  expect(invoke).toHaveBeenCalledTimes(3);
});

test('address interval is validated and saved as a local application setting', async () => {
  for (const locationRefreshSeconds of [1, 1.5, 5, 300]) expect(validateAppSettings({ ...DEFAULT_APP_SETTINGS, locationRefreshSeconds }).locationRefreshSeconds).toBe(locationRefreshSeconds);
  for (const locationRefreshSeconds of [0, .9, 300.1, NaN, Infinity]) expect(() => validateAppSettings({ ...DEFAULT_APP_SETTINGS, locationRefreshSeconds })).toThrow();
  await saveAppSettings({ ...DEFAULT_APP_SETTINGS, locationRefreshSeconds: 8 });
  expect(invoke).toHaveBeenCalledWith('save_app_settings', { settings: { ...DEFAULT_APP_SETTINGS, locationRefreshSeconds: 8 } });
  vi.mocked(invoke).mockResolvedValueOnce({ settings: { ...DEFAULT_APP_SETTINGS, locationRefreshSeconds: 8 }, amapConfigured: true, cache: { bytes: 0, files: 0, path: '' } });
  expect((await loadAppSettings()).settings.locationRefreshSeconds).toBe(8);
});
