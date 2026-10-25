import type { OverlayContext } from './overlayContext';
import type { Sample, Widget } from './types';
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
export const hasLocationFields = (widget: Widget) => widget.kind === 'svg' && /\{\$(Province|City|District|Street|Road|HasAddress)\}/.test(widget.svg?.source ?? '');
// About 20m cells in China: shared by all five labels, with no requests per video frame.
const cell = (point: LocationCoordinate): LocationCoordinate => ({ latitude: Math.round(point.latitude * 5000) / 5000, longitude: Math.round(point.longitude * 5000) / 5000 });
export function locationQuery(sample: Sample | null, context: OverlayContext): LocationQuery | null {
  if (!sample) return null;
  const current = cell(sample);
  const samples = context.track?.samples;
  let approach: LocationCoordinate | null = null;
  if (samples?.length && sample.distanceMeters != null && sample.distanceMeters >= 40) {
    // Cumulative distance is monotonic; seeking does not depend on previously played frames.
    const target = sample.distanceMeters - 40;
    let low = 0, high = samples.length;
    while (low < high) { const mid = (low + high) >>> 1; if ((samples[mid]!.distanceMeters ?? 0) <= target) low = mid + 1; else high = mid; }
    const point = samples[Math.max(0, low - 1)];
    if (point && point.segment === sample.segment && point.timestampMs < sample.timestampMs) {
      const previous = cell(point);
      if (previous.latitude !== current.latitude || previous.longitude !== current.longitude) approach = previous;
    }
  }
  return { ...current, approach };
}
export const locationKey = (query: LocationQuery) => JSON.stringify(query);
export const escapeXml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
