import type { Track, Sample } from "./types";
import { sampleAt } from "./telemetry";
export function sampleInterval(refresh: number): number {
  return Math.max(0.01, Math.min(10, Number(refresh) || 0.2));
}
/** Quantize playback seconds to the shared data-refresh cadence. */
export function quantizeElapsed(elapsed: number, refresh: number): number {
  const interval = sampleInterval(refresh);
  return Math.floor((elapsed + 1e-8) / interval) * interval;
}
/** One deterministic snapshot shared by playback and offline export. */
export function playbackSample(track: Track, elapsed: number, offset: number, refresh: number): Sample | null {
  const current = sampleAt(track, track.startMs + (offset + elapsed) * 1000);
  if (!current) return null;
  const time = quantizeElapsed(elapsed, refresh);
  const quantized = sampleAt(track, track.startMs + (offset + time) * 1000);
  return quantized?.segment === current.segment &&
    !(current.speedValid === false && quantized.speedValid !== false)
    ? quantized : current;
}
