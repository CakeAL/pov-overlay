import type { Sample, Track, TrackSource } from "./types";
import { distance } from "./geography";
import { MAX_GAP_MS } from "./telemetry";
type Owned = Sample & { owner: string; originalSegment: number };
/** Later imports replace earlier samples throughout their continuous coverage, not by alternating fixes. */
export function mergeTracks(
  sources: TrackSource[],
  join = true,
): { track: Track | null; overwritten: number; breaks: number } {
  let points: Owned[] = [],
    overwritten = 0;
  let skipped = 0;
  const active = sources.filter((s) => s.enabled !== false);
  for (const source of active) {
    const samples = source.track.samples,
      ranges: Array<[number, number]> = [];
    for (let start = 0; start < samples.length; ) {
      let end = start + 1;
      while (
        end < samples.length &&
        samples[end]!.segment === samples[end - 1]!.segment &&
        samples[end]!.timestampMs - samples[end - 1]!.timestampMs <= MAX_GAP_MS
      )
        end++;
      ranges.push([samples[start]!.timestampMs, samples[end - 1]!.timestampMs]);
      start = end;
    }
    let range = 0;
    const before = points.length;
    points = points.filter((p) => {
      while (range < ranges.length && ranges[range]![1] < p.timestampMs)
        range++;
      const r = ranges[range];
      return !r || p.timestampMs < r[0] || p.timestampMs > r[1];
    });
    overwritten += before - points.length;
    skipped += source.track.skippedPoints;
    points = points.concat(
      samples.map((p) => ({
        ...p,
        owner: source.id,
        originalSegment: p.segment,
      })),
    );
    points.sort((a, b) => a.timestampMs - b.timestampMs);
  }
  if (points.length < 2) return { track: null, overwritten, breaks: 0 };
  let segment = 0,
    total = 0;
  const samples: Sample[] = points.map((p, i) => {
    const prev = points[i - 1];
    let connected = false;
    if (prev) {
      const dt = p.timestampMs - prev.timestampMs;
      connected =
        dt > 0 &&
        dt <= MAX_GAP_MS &&
        (prev.owner === p.owner
          ? prev.originalSegment === p.originalSegment
          : join && distance(prev, p) / (dt / 1000) <= 100);
      if (!connected) segment++;
    }
    const meters = prev && connected ? distance(prev, p) : 0;
    total += meters;
    return {
      timestampMs: p.timestampMs,
      latitude: p.latitude,
      longitude: p.longitude,
      elevation: p.elevation,
      speedMps:
        prev && connected
          ? meters / ((p.timestampMs - prev.timestampMs) / 1000)
          : 0,
      segment,
    };
  });
  for (let i = 0; i < samples.length - 1; i++)
    if (
      (i === 0 || samples[i]!.segment !== samples[i - 1]!.segment) &&
      samples[i]!.segment === samples[i + 1]!.segment
    )
      samples[i]!.speedMps = samples[i + 1]!.speedMps;
  return {
    track: {
      name: active.map((s) => s.track.name).join(" + "),
      samples,
      startMs: samples[0]!.timestampMs,
      endMs: samples.at(-1)!.timestampMs,
      distanceMeters: total,
      skippedPoints: skipped,
    },
    overwritten,
    breaks: segment,
  };
}
