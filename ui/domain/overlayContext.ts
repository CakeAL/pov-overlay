import type { Track, Sample } from './types';
export interface JourneyProgress {
  distanceMeters: number;
  remainingMeters: number;
  totalMeters: number;
  remainingSeconds: number;
  totalSeconds: number;
  fraction: number;
  distanceFraction?: number;
}
export interface OverlayContext {
  speedMaxKmh?: number;
  track?: Track | null;
  timestampMs?: number;
  progress?: JourneyProgress | null;
}
export function overlayContext(track: Track | null, timestampMs: number, sample: Sample | null): OverlayContext {
  if (!track) return {};
  const totalMeters = track.samples.at(-1)?.distanceMeters ?? track.distanceMeters;
  // Seek-safe predecessor lookup: do not depend on playback history or borrow future points.
  let low = 0, high = track.samples.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (track.samples[mid]!.timestampMs <= timestampMs) low = mid + 1;
    else high = mid;
  }
  const previous = sample ?? track.samples[low - 1];
  const distanceMeters = previous?.distanceMeters ?? 0;
  const progressTime = Math.max(track.startMs, Math.min(track.endMs, Number.isFinite(timestampMs) ? timestampMs : track.startMs));
  const totalSeconds = Math.max(0, (track.endMs - track.startMs) / 1000);
  return { track, timestampMs, progress: {
    distanceMeters, remainingMeters: Math.max(0, totalMeters - distanceMeters), totalMeters,
    remainingSeconds: Math.max(0, (track.endMs - progressTime) / 1000),
    totalSeconds,
    fraction: totalSeconds > 0 ? (progressTime - track.startMs) / (totalSeconds * 1000) : 0,
    distanceFraction: totalMeters > 0 ? Math.max(0, Math.min(1, distanceMeters / totalMeters)) : 0,
  } };
}
