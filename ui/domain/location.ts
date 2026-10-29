import type { OverlayContext } from './overlayContext';
import { MAX_GAP_MS, type Sample, type Track, type Widget } from './types';
import { sampleAt } from './telemetry';
export interface LocationAddress { province: string; city: string; district: string; street: string; road: string }
export interface LocationCoordinate { latitude: number; longitude: number }
export interface LocationQuery extends LocationCoordinate { approach: LocationCoordinate | null }
export const LOCATION_FIELDS = [
  { key: 'province', field: 'Province', label: '当前省' },
  { key: 'city', field: 'City', label: '当前市' },
  { key: 'district', field: 'District', label: '当前区' },
  { key: 'street', field: 'Street', label: '当前街道' },
  { key: 'road', field: 'Road', label: '当前路名' },
] as const;
export const hasLocationFields = (widget: Widget) => widget.kind === 'svg' && (!!widget.svg?.roadInfo || /\{\$(Province|City|District|Street|Road|HasAddress)\}/.test(widget.svg?.source ?? ''));
// About 20m cells in China: shared by all five labels, with no requests per video frame.
const cell = (point: LocationCoordinate): LocationCoordinate => ({ latitude: Math.round(point.latitude * 5000) / 5000, longitude: Math.round(point.longitude * 5000) / 5000 });
const starts = new WeakMap<Track, number[]>();
/** Cache coverage boundaries once; sampling never scans the whole track per frame. */
function continuityStart(track: Track, timestampMs: number): number {
  let boundaries = starts.get(track);
  if (!boundaries) {
    boundaries = track.samples.flatMap((point, index, samples) => {
      const previous = samples[index - 1];
      return !previous || previous.segment !== point.segment || point.timestampMs - previous.timestampMs > MAX_GAP_MS ? [point.timestampMs] : [];
    });
    starts.set(track, boundaries);
  }
  let low = 0, high = boundaries.length;
  while (low < high) { const mid = (low + high) >>> 1; if (boundaries[mid]! <= timestampMs) low = mid + 1; else high = mid; }
  return boundaries[low - 1]!;
}
function locationSample(track: Track, timestampMs: number, intervalSeconds: number): Sample | null {
  if (!sampleAt(track, timestampMs)) return null;
  const startMs = continuityStart(track, timestampMs);
  const intervalMs = Math.max(1, Math.min(300, Number(intervalSeconds) || 5)) * 1000;
  const bucketMs = startMs + Math.floor((timestampMs - startMs + 1e-5) / intervalMs) * intervalMs;
  return sampleAt(track, Math.min(timestampMs, bucketMs));
}
export function locationQuery(sample: Sample | null, context: OverlayContext, intervalSeconds = 5): LocationQuery | null {
  if (!sample) return null;
  if (context.track) sample = locationSample(context.track, context.timestampMs ?? sample.timestampMs, intervalSeconds);
  if (!sample) return null;
  const current = cell(sample);
  const samples = context.track?.samples;
  let approach: LocationCoordinate | null = null;
  if (samples?.length && sample.distanceMeters != null) {
    // Cumulative distance is monotonic; seeking does not depend on previously played frames.
    // 80m puts the reference before the whole ±35m junction area, even just after crossing.
    const startMs = continuityStart(context.track!, sample.timestampMs);
    const startDistance = sampleAt(context.track!, startMs)?.distanceMeters ?? sample.distanceMeters;
    const target = Math.max(startDistance, sample.distanceMeters - 80);
    let low = 0, high = samples.length;
    while (low < high) { const mid = (low + high) >>> 1; if ((samples[mid]!.distanceMeters ?? 0) <= target) low = mid + 1; else high = mid; }
    let point = samples[Math.max(0, low - 1)];
    if (point && point.segment === sample.segment && point.timestampMs < sample.timestampMs && point.timestampMs >= startMs) {
      const next = samples[low];
      if (next && next.segment === point.segment && next.timestampMs - point.timestampMs <= MAX_GAP_MS && next.distanceMeters! > point.distanceMeters!) {
        const fraction = (target - point.distanceMeters!) / (next.distanceMeters! - point.distanceMeters!);
        point = sampleAt(context.track!, point.timestampMs + fraction * (next.timestampMs - point.timestampMs)) ?? point;
      }
      const previous = cell(point);
      if (previous.latitude !== current.latitude || previous.longitude !== current.longitude) approach = previous;
    }
  }
  return { ...current, approach };
}
export const locationKey = (query: LocationQuery) => JSON.stringify(query);
export const escapeXml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
