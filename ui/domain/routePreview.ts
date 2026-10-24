import type { Sample, Track } from "./types";
import { MAX_GAP_MS } from "./types";
function simplify(points: Array<{ x: number; y: number }>, epsilon = 0.6) {
  if (points.length < 3) return points;
  const keep = new Set([0, points.length - 1]),
    stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!,
      p = points[a!]!,
      q = points[b!]!,
      dx = q.x - p.x,
      dy = q.y - p.y,
      den = dx * dx + dy * dy;
    let best = -1,
      max = epsilon * epsilon;
    for (let i = a! + 1; i < b!; i++) {
      const v = points[i]!,
        t = den
          ? Math.max(
              0,
              Math.min(1, ((v.x - p.x) * dx + (v.y - p.y) * dy) / den),
            )
          : 0,
        d = (v.x - p.x - t * dx) ** 2 + (v.y - p.y - t * dy) ** 2;
      if (d > max) {
        max = d;
        best = i;
      }
    }
    if (best >= 0) {
      keep.add(best);
      stack.push([a!, best], [best, b!]);
    }
  }
  return [...keep].sort((a, b) => a - b).map((i) => points[i]!);
}
/** Local equirectangular projection: one scale for both axes, with dateline unwrapping. */
export function routePreview(
  track: Track,
  width = 240,
  height = 110,
  padding = 8,
) {
  const origin = track.samples[0]!.longitude,
    meanLat =
      track.samples.reduce((sum, p) => sum + p.latitude, 0) /
      track.samples.length;
  const cosine = Math.max(0.0001, Math.cos((meanLat * Math.PI) / 180));
  const unwrapped: number[] = [];
  for (let i = 0; i < track.samples.length; i++) {
    const p = track.samples[i]!,
      prev = track.samples[i - 1],
      anchor = prev && p.segment === prev.segment ? unwrapped[i - 1]! : origin;
    unwrapped.push(
      anchor + ((((p.longitude - anchor + 180) % 360) + 360) % 360) - 180,
    );
  }
  const raw = track.samples.map((p, i) => ({
    x: unwrapped[i]! * cosine,
    y: -p.latitude,
  }));
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of raw) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const spanX = maxX - minX,
    spanY = maxY - minY,
    scale = Math.min(
      spanX ? (width - 2 * padding) / spanX : Infinity,
      spanY ? (height - 2 * padding) / spanY : Infinity,
    ),
    factor = Number.isFinite(scale) ? scale : 1;
  const project = (p: { x: number; y: number }) => ({
    x: (p.x - (minX + maxX) / 2) * factor + width / 2,
    y: (p.y - (minY + maxY) / 2) * factor + height / 2,
  });
  const segments: string[] = [];
  for (let start = 0; start < raw.length; ) {
    let end = start + 1;
    while (
      end < raw.length &&
      track.samples[end]!.segment === track.samples[end - 1]!.segment &&
      track.samples[end]!.timestampMs - track.samples[end - 1]!.timestampMs <=
        MAX_GAP_MS
    )
      end++;
    const points = simplify(raw.slice(start, end).map(project));
    segments.push(
      points
        .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
        .join(" "),
    );
    start = end;
  }
  return {
    path: segments.join(" "),
    point: (p: Sample) => {
      const anchor = (minX + maxX) / 2 / cosine,
        lon =
          anchor + ((((p.longitude - anchor + 180) % 360) + 360) % 360) - 180;
      return project({ x: lon * cosine, y: -p.latitude });
    },
  };
}
export function coverageIntervals(track: Track): Array<[number, number]> {
  const intervals: Array<[number, number]> = [];
  for (let start = 0; start < track.samples.length; ) {
    let end = start + 1;
    while (
      end < track.samples.length &&
      track.samples[end]!.segment === track.samples[end - 1]!.segment &&
      track.samples[end]!.timestampMs - track.samples[end - 1]!.timestampMs <=
        MAX_GAP_MS
    )
      end++;
    intervals.push([
      track.samples[start]!.timestampMs,
      track.samples[end - 1]!.timestampMs,
    ]);
    start = end;
  }
  return intervals;
}
