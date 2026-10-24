import type { Sample, Track } from "./types";
export const MAX_GAP_MS = 30_000;
export { distance } from "./geography";
import { angleBetween, cubicSpeed } from "./motion";
export function sampleAt(track: Track, timestampMs: number): Sample | null {
  if (timestampMs < track.startMs || timestampMs > track.endMs) return null;
  const threshold = track.stopThresholdMps ?? 0;
  const stationary = (
    sample: Sample,
    heldHeading = sample.headingDeg,
  ): Sample =>
    sample.speedMps < threshold
      ? { ...sample, speedMps: 0, headingDeg: heldHeading }
      : sample;
  let low = 0,
    high = track.samples.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const sample = track.samples[middle]!;
    if (sample.timestampMs === timestampMs) {
      const before = track.samples[middle - 1],
        after = track.samples[middle + 1];
      const hasBefore =
        before &&
        before.segment === sample.segment &&
        sample.timestampMs - before.timestampMs <= MAX_GAP_MS;
      const hasAfter =
        after &&
        after.segment === sample.segment &&
        after.timestampMs - sample.timestampMs <= MAX_GAP_MS;
      return hasBefore || hasAfter ? stationary(sample) : null;
    }
    if (sample.timestampMs < timestampMs) low = middle + 1;
    else high = middle - 1;
  }
  const a = track.samples[high],
    b = track.samples[low];
  if (
    !a ||
    !b ||
    a.segment !== b.segment ||
    b.timestampMs - a.timestampMs > MAX_GAP_MS
  )
    return null;
  const progress =
    (timestampMs - a.timestampMs) / (b.timestampMs - a.timestampMs);
  const mix = (x: number, y: number) => x + (y - x) * progress;
  const delta = ((b.longitude - a.longitude + 540) % 360) - 180;
  const longitude = ((a.longitude + delta * progress + 540) % 360) - 180;
  return stationary(
    {
      timestampMs,
      latitude: mix(a.latitude, b.latitude),
      longitude,
      elevation:
        a.elevation !== null && b.elevation !== null
          ? mix(a.elevation, b.elevation)
          : null,
      speedMps: cubicSpeed(a, b, progress),
      speedValid: a.speedValid !== false && b.speedValid !== false,
      headingDeg: angleBetween(a.headingDeg, b.headingDeg, progress),
      distanceMeters:
        a.distanceMeters != null && b.distanceMeters != null
          ? mix(a.distanceMeters, b.distanceMeters)
          : undefined,
      segment: a.segment,
    },
    a.headingDeg,
  );
}
export function alignmentOffset(track: Track, capturedAtMs: number): number {
  return (capturedAtMs - track.startMs) / 1000;
}
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00";
  const value = Math.max(0, Math.floor(seconds));
  const h = Math.floor(value / 3600),
    m = Math.floor(value / 60) % 60,
    s = value % 60;
  return `${h ? `${String(h).padStart(2, "0")}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
export function formatCoordinate(
  value: number | undefined,
  axis: "lat" | "lon",
): string {
  if (value === undefined) return "—";
  return `${Math.abs(value).toFixed(6)}° ${axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W"}`;
}
