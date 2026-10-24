import type { Track, Sample } from './types';
export interface JourneyProgress {
  distanceMeters: number;
  remainingMeters: number;
  totalMeters: number;
  remainingSeconds: number;
  totalSeconds: number;
  fraction: number;
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
  const progressTime = previous?.timestampMs ?? track.startMs;
  return { track, timestampMs, progress: {
    distanceMeters, remainingMeters: Math.max(0, totalMeters - distanceMeters), totalMeters,
    remainingSeconds: Math.max(0, (track.endMs - progressTime) / 1000),
    totalSeconds: (track.endMs - track.startMs) / 1000,
    fraction: totalMeters > 0 ? Math.max(0, Math.min(1, distanceMeters / totalMeters)) : 0,
  } };
}
