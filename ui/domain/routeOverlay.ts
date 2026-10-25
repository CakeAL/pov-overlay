import type { OverlayContext } from './overlayContext';
import type { Sample, Track, Widget } from './types';
import { routePreview } from './routePreview';
const cache = new WeakMap<Track, Map<string, ReturnType<typeof routePreview>>>();
function lowerBound(track: Track, time: number) {
  let low = 0, high = track.samples.length;
  while (low < high) { const mid = (low + high) >>> 1; if (track.samples[mid]!.timestampMs < time) low = mid + 1; else high = mid; }
  return low;
}
export function routeOverlay(widget: Widget, sample: Sample | null, context: OverlayContext): string {
  const track = context.track;
  let body = '';
  if (track?.samples.length) {
    const currentIndex = Math.min(track.samples.length - 1, lowerBound(track, context.timestampMs ?? track.startMs));
    const current = sample ?? track.samples[Math.max(0, currentIndex - 1)]!;
    const local = widget.route?.mode === 'local';
    const span = Math.max(10, widget.route?.windowSeconds ?? 120) * 1000 / 2;
    let start = local ? Math.max(0, lowerBound(track, current.timestampMs - span) - 1) : 0;
    let end = local ? Math.min(track.samples.length, lowerBound(track, current.timestampMs + span) + 1) : track.samples.length;
    if (end <= start) { start = Math.max(0, currentIndex - 1); end = Math.min(track.samples.length, start + 2); }
    const key = `${start}:${end}${local ? `:${current.latitude}:${current.longitude}` : ''}`;
    let entries = cache.get(track);
    if (!entries) { entries = new Map(); cache.set(track, entries); }
    let geometry = entries.get(key);
    if (!geometry) {
      geometry = routePreview({ ...track, samples: track.samples.slice(start, end) }, 300, 300, 24, local ? current : undefined);
      if (entries.size >= 16) entries.delete(entries.keys().next().value!);
      entries.set(key, geometry);
    }
    const point = geometry.point(current);
    const angle = widget.route?.headingUp && sample?.headingDeg != null ? -sample.headingDeg : 0;
    const rotation = widget.route?.headingUp ? `translate(150 150) scale(.7) rotate(${angle}) translate(-150 -150)` : '';
    const color = /^#[0-9a-f]{6}$/i.test(widget.color) ? widget.color : '#ffffff';
    const marker = sample ? sample.headingDeg == null
      ? `<circle cx="${point.x}" cy="${point.y}" r="6" fill="white"/>`
      : `<g transform="translate(${point.x} ${point.y}) rotate(${sample.headingDeg})"><path d="M0 -12L-8 9L0 5L8 9Z" fill="white" stroke="#1c3023" stroke-width="2"/></g>` : '';
    body = `<g transform="${rotation}"><path d="${geometry.path}" fill="none" stroke="#13201988" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><path d="${geometry.path}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${marker}<text x="150" y="17" text-anchor="middle" fill="white" font-family="sans-serif" font-size="13">N</text></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">${body}</svg>`;
}
