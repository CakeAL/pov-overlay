import type { Sample } from "./types";
import { distance } from "./geography";

/**
 * Uses gpx.studio's distance-over-time window approach, with interpolated window
 * boundaries and isolated GPS detour rejection for video telemetry.
 * Reference: https://github.com/gpxstudio/gpx.studio/blob/6a0d4343718e01637a8e301251977fb218cf88f8/gpx/src/gpx.ts#L964-L980
 * Independently implemented; no upstream source is copied.
 */
export function estimateSegmentSpeed(
  samples: Sample[],
  start: number,
  end: number,
  windowSeconds: number,
): { speedsMps: number[]; movementSpeedsMps: number[]; positions: Sample[] } {
  const original = samples.slice(start, end);
  if (windowSeconds <= 0) {
    const speedsMps = original.map((point) => point.speedMps);
    return { speedsMps, movementSpeedsMps: speedsMps, positions: original };
  }
  const positions = original.slice();
  const intervals = original.map((point, index) =>
    index
      ? distance(original[index - 1]!, point) /
        ((point.timestampMs - original[index - 1]!.timestampMs) / 1000)
      : 0,
  );
  // A real fast section is retained. Reject only an isolated out-and-back detour
  // whose two legs greatly exceed both surrounding motion and the direct bridge.
  for (let i = 1; i + 1 < original.length; i++) {
    const before = original[i - 1]!,
      point = original[i]!,
      after = original[i + 1]!;
    const neighbors: number[] = [];
    if (i > 1) neighbors.push(intervals[i - 1]!);
    if (i + 2 < original.length) neighbors.push(intervals[i + 2]!);
    if (!neighbors.length) continue;
    const bridge = distance(before, after);
    const elapsed = (after.timestampMs - before.timestampMs) / 1000;
    const baseline = Math.max(0.5, bridge / elapsed, ...neighbors);
    const limit = Math.max(3 * baseline, baseline + 5);
    if (
      intervals[i]! <= limit ||
      intervals[i + 1]! <= limit ||
      distance(before, point) + distance(point, after) <= 3 * bridge + 5
    )
      continue;
    const fraction =
      (point.timestampMs - before.timestampMs) /
      (after.timestampMs - before.timestampMs);
    const longitudeDelta =
      ((after.longitude - before.longitude + 540) % 360) - 180;
    positions[i] = {
      ...point,
      latitude: before.latitude + (after.latitude - before.latitude) * fraction,
      longitude:
        ((before.longitude + longitudeDelta * fraction + 540) % 360) - 180,
    };
  }
  const cumulative = new Float64Array(positions.length);
  const movementSpeedsMps = positions.map((point, index) => {
    if (!index) return 0;
    const previous = positions[index - 1]!;
    const meters = distance(previous, point);
    cumulative[index] = cumulative[index - 1]! + meters;
    return meters / ((point.timestampMs - previous.timestampMs) / 1000);
  });
  if (positions.length > 1) movementSpeedsMps[0] = movementSpeedsMps[1]!;
  const first = positions[0]!.timestampMs,
    last = positions.at(-1)!.timestampMs;
  const leftCursor = { index: 0 },
    rightCursor = { index: 0 };
  function distanceAt(time: number, cursor: { index: number }): number {
    while (
      cursor.index + 1 < positions.length &&
      positions[cursor.index + 1]!.timestampMs <= time
    )
      cursor.index++;
    const a = positions[cursor.index]!,
      b = positions[cursor.index + 1];
    if (!b) return cumulative[cursor.index]!;
    const fraction = (time - a.timestampMs) / (b.timestampMs - a.timestampMs);
    return (
      cumulative[cursor.index]! +
      fraction * (cumulative[cursor.index + 1]! - cumulative[cursor.index]!)
    );
  }
  const widthMs = Math.max(1000, windowSeconds * 1000);
  const speedsMps = positions.map((point) => {
    let left = Math.max(first, point.timestampMs - widthMs / 2);
    let right = Math.min(last, point.timestampMs + widthMs / 2);
    // Keep a full window near the endpoints where enough data exists.
    if (left === first) right = Math.min(last, first + widthMs);
    if (right === last) left = Math.max(first, last - widthMs);
    return Math.max(
      0,
      (distanceAt(right, rightCursor) - distanceAt(left, leftCursor)) /
        Math.max(1, (right - left) / 1000),
    );
  });
  return { speedsMps, movementSpeedsMps, positions };
}
