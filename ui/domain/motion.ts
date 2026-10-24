import type { Sample, Track } from "./types";
import { distance } from "./geography";
import { estimateSegmentSpeed } from "./speedEstimation";
const MAX_GAP_MS = 30_000;
const rad = (v: number) => (v * Math.PI) / 180;
export function bearing(a: Sample, b: Sample): number | null {
  if (distance(a, b) < 0.5) return null;
  const lat1 = rad(a.latitude),
    lat2 = rad(b.latitude),
    lon = rad(b.longitude - a.longitude);
  return (
    ((Math.atan2(
      Math.sin(lon) * Math.cos(lat2),
      Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon),
    ) *
      180) /
      Math.PI +
      360) %
    360
  );
}
export function angleBetween(
  a: number | null | undefined,
  b: number | null | undefined,
  t: number,
): number | null {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return (a + (((b - a + 540) % 360) - 180) * t + 360) % 360;
}
/** Cached distance-over-time speed estimates, followed by monotone cubic interpolation. */
export function prepareMotion(
  track: Track,
  windowSeconds: number,
  stopThresholdKmh = 0,
): Track {
  const stopThresholdMps = Math.max(0, stopThresholdKmh) / 3.6;
  const points = track.samples.map((p) => ({ ...p }));
  let total = 0;
  for (let start = 0; start < points.length; ) {
    let end = start + 1;
    while (
      end < points.length &&
      points[end]!.segment === points[end - 1]!.segment &&
      points[end]!.timestampMs - points[end - 1]!.timestampMs <= MAX_GAP_MS
    )
      end++;
    const estimate = estimateSegmentSpeed(
      track.samples,
      start,
      end,
      windowSeconds,
    );
    let heading: number | null = null;
    for (let i = start; i < end; i++) {
      const p = points[i]!,
        local = i - start;
      if (i > start) total += distance(points[i - 1]!, p);
      p.distanceMeters = total;
      p.speedValid = local > 0;
      p.speedMps = estimate.speedsMps[local]!;
      if (
        p.speedValid &&
        p.speedMps >= stopThresholdMps &&
        estimate.movementSpeedsMps[local]! >= stopThresholdMps
      ) {
        if (local > 0)
          heading =
            bearing(
              estimate.positions[local - 1]!,
              estimate.positions[local]!,
            ) ?? heading;
        else if (
          local + 1 < estimate.positions.length &&
          estimate.movementSpeedsMps[local + 1]! >= stopThresholdMps
        )
          heading = bearing(
            estimate.positions[local]!,
            estimate.positions[local + 1]!,
          );
      }
      p.headingDeg = heading;
    }
    for (let i = start; i < end; i++) {
      const p = points[i]!;
      const slope = (j: number) =>
        (points[j + 1]!.speedMps - points[j]!.speedMps) /
        ((points[j + 1]!.timestampMs - points[j]!.timestampMs) / 1000);
      if (end - start === 1) p.speedSlope = 0;
      else if (i === start) p.speedSlope = slope(i);
      else if (i === end - 1) p.speedSlope = slope(i - 1);
      else {
        const a = slope(i - 1),
          b = slope(i),
          h1 = (p.timestampMs - points[i - 1]!.timestampMs) / 1000,
          h2 = (points[i + 1]!.timestampMs - p.timestampMs) / 1000,
          w1 = 2 * h2 + h1,
          w2 = h2 + 2 * h1;
        p.speedSlope = a * b <= 0 ? 0 : (w1 + w2) / (w1 / a + w2 / b);
      }
    }
    start = end;
  }
  return { ...track, samples: points, stopThresholdMps };
}
export function cubicSpeed(a: Sample, b: Sample, t: number): number {
  if (a.speedSlope == null || b.speedSlope == null)
    return a.speedMps + (b.speedMps - a.speedMps) * t;
  const h = (b.timestampMs - a.timestampMs) / 1000,
    t2 = t * t,
    t3 = t2 * t;
  const value =
    (2 * t3 - 3 * t2 + 1) * a.speedMps +
    (t3 - 2 * t2 + t) * h * a.speedSlope +
    (-2 * t3 + 3 * t2) * b.speedMps +
    (t3 - t2) * h * b.speedSlope;
  return Math.max(
    0,
    Math.min(
      Math.max(a.speedMps, b.speedMps),
      Math.max(Math.min(a.speedMps, b.speedMps), value),
    ),
  );
}
