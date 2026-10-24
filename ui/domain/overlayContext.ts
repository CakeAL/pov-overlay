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
  track?: Track | null;
  timestampMs?: number;
  progress?: JourneyProgress | null;
}
export function overlayContext(track: Track | null, timestampMs: number, sample: Sample | null): OverlayContext {
  if (!track) return {};
  const totalMeters = track.samples.at(-1)?.distanceMeters ?? track.distanceMeters;
  const distanceMeters = sample?.distanceMeters ?? 0;
  return { track, timestampMs, progress: sample ? {
    distanceMeters, remainingMeters: Math.max(0, totalMeters - distanceMeters), totalMeters,
    remainingSeconds: Math.max(0, (track.endMs - sample.timestampMs) / 1000),
    totalSeconds: (track.endMs - track.startMs) / 1000,
    fraction: totalMeters > 0 ? Math.max(0, Math.min(1, distanceMeters / totalMeters)) : 0,
  } : null };
}
