import { computed, onBeforeUnmount, ref } from 'vue';
import { mercator } from '../domain/mapOverlay';
import { sourceElevation } from '../domain/sourceElevation';
import { sampleTerrainTile } from '../infrastructure/maps/elevation';
import type { MediaSession } from './useMediaSession';
import type { EditorMessages } from './useMessages';
interface Target { sourceId: string; index: number; latitude: number; longitude: number }
export function useElevation(media: MediaSession, messages: EditorMessages) {
  const busy = ref(false), processed = ref(0), total = ref(0);
  const hasOverrides = computed(() => media.sources.value.some(source => source.elevationOverride != null));
  let cancelled = false;
  function cancel() { cancelled = true; }
  function restore() {
    if (busy.value) return;
    media.restoreSources(media.sources.value.map(({ elevationOverride: _, ...source }) => source));
    messages.notice.value = '已恢复原始海拔。';
  }
  async function run() {
    if (busy.value) return;
    busy.value = true; cancelled = false; processed.value = 0; total.value = 0; messages.clear();
    const sources = media.sources.value;
    const updates = new Map<string, (number | null)[]>();
    const groups = new Map<string, { x: number; y: number; targets: Target[] }>();
    let available = 0;
    try {
      for (const source of sources.filter(source => source.enabled !== false)) {
        const effective = sourceElevation(source);
        const values = [...(source.elevationOverride ?? source.track.samples.map(() => null))];
        updates.set(source.id, values);
        effective.samples.forEach((sample, index) => {
          const fraction = mercator(sample.latitude, sample.longitude, 12);
          const x = ((Math.floor(fraction.x) % 4096) + 4096) % 4096, y = Math.max(0, Math.min(4095, Math.floor(fraction.y)));
          const key = `${x}/${y}`;
          if (!groups.has(key)) groups.set(key, { x, y, targets: [] });
          groups.get(key)!.targets.push({ sourceId: source.id, index, latitude: sample.latitude, longitude: sample.longitude });
          total.value++;
        });
      }
      if (!total.value) { messages.notice.value = '没有可替换海拔的轨迹点。'; return; }
      for (const group of groups.values()) {
        for (let start = 0; start < group.targets.length; start += 4096) {
          if (cancelled) return;
          const targets = group.targets.slice(start, start + 4096);
          const values = await sampleTerrainTile(group.x, group.y, targets.map(({ latitude, longitude }) => ({ latitude, longitude })));
          if (cancelled) return;
          if (media.sources.value !== sources) throw new Error('轨迹已改变，请重新获取海拔。');
          values.forEach((value, i) => { if (value != null) { const target = targets[i]!; updates.get(target.sourceId)![target.index] = value; available++; } });
          processed.value += targets.length;
        }
      }
      if (!cancelled && available) media.restoreSources(sources.map(source => updates.has(source.id) ? { ...source, elevationOverride: updates.get(source.id)! } : source));
      messages.notice.value = `已更新 ${available.toLocaleString()} 个海拔点${available < total.value ? `，${(total.value - available).toLocaleString()} 点无有效地形数据，保留原值` : ''}。`;
    } catch (reason) { if (!cancelled) messages.report(reason); }
    finally { busy.value = false; }
  }
  onBeforeUnmount(cancel);
  return { busy, processed, total, hasOverrides, run, cancel, restore };
}
