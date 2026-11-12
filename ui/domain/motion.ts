import type { Sample, Track } from "./types";
import { distance } from "./geography";
import { estimateSegmentSpeed } from "./speedEstimation";
import { MAX_GAP_MS } from "./types";
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
/**
 * DJI logs at 2 Hz while the GPS fix updates at 1 Hz, producing paired points
 * with identical coordinates. Keeping the stale pair makes linear position
 * interpolation hold for half the interval and then jump. Collapse a moving
 * pair to its first point, but leave longer runs intact so real stops remain
 * stationary for point-window smoothing.
 */
function collapseDuplicatePositions(samples: Sample[]): Sample[] {
  const result: Sample[] = [];
  for (let start = 0; start < samples.length; ) {
    const first = samples[start]!;
    let end = start + 1;
    while (
      end < samples.length &&
      samples[end]!.segment === first.segment &&
      samples[end]!.timestampMs - samples[end - 1]!.timestampMs <= MAX_GAP_MS &&
      samples[end]!.latitude === first.latitude &&
      samples[end]!.longitude === first.longitude
    )
      end++;
    const last = samples[end - 1]!,
      next = samples[end];
    const nextInSegment =
      next != null &&
      next.segment === first.segment &&
      next.timestampMs - last.timestampMs <= MAX_GAP_MS;
    result.push(first);
    // Only a moving two-point paired fix is stale; keep longer stationary
    // runs intact so point-window smoothing still sees the full stop.
    if (end - start !== 2 || !nextInSegment)
      for (let index = start + 1; index < end; index++)
        result.push(samples[index]!);
    start = end;
  }
  return result;
}

/** Cached distance-over-time speed estimates, followed by monotone cubic interpolation. */
export function prepareMotion(
  track: Track,
  windowPoints: number,
  stopThresholdKmh = 0,
): Track {
  const stopThresholdMps = Math.max(0, stopThresholdKmh) / 3.6;
  const samples = collapseDuplicatePositions(track.samples);
  const points = samples.map((p) => ({ ...p }));
  let total = 0;
  for (let start = 0; start < points.length; ) {
    let end = start + 1;
    while (
      end < points.length &&
      points[end]!.segment === points[end - 1]!.segment &&
      points[end]!.timestampMs - points[end - 1]!.timestampMs <= MAX_GAP_MS
    )
      end++;
    const estimate = estimateSegmentSpeed(samples, start, end, windowPoints);
    let heading: number | null = null;
    for (let i = start; i < end; i++) {
      const p = points[i]!,
        local = i - start;
      if (i > start) total += distance(points[i - 1]!, p);
      p.distanceMeters = total;
      p.speedValid = estimate.speedValid[local]!;
      p.speedMps = estimate.speedsMps[local]!;
      if (
        local > 0 &&
        p.speedValid &&
        p.speedMps >= stopThresholdMps &&
        estimate.movementSpeedsMps[local]! >= stopThresholdMps
      ) {
        heading =
          bearing(estimate.positions[local - 1]!, estimate.positions[local]!) ??
          heading;
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
