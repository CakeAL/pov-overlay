import type { Track, Sample } from "./types";
import { sampleAt } from "./telemetry";
/** One deterministic snapshot shared by playback and offline export. */
export function playbackSample(track: Track, elapsed: number, offset: number, refresh: number): Sample | null {
  const interval = Math.max(0.01, Math.min(10, Number(refresh) || 0.2));
  const current = sampleAt(track, track.startMs + (offset + elapsed) * 1000);
  if (!current) return null;
  const time = Math.floor((elapsed + 1e-8) / interval) * interval;
  const quantized = sampleAt(track, track.startMs + (offset + time) * 1000);
  return quantized?.segment === current.segment &&
    !(current.speedValid === false && quantized.speedValid !== false)
    ? quantized : current;
}
