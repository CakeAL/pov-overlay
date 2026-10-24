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
): {
  speedsMps: number[];
  movementSpeedsMps: number[];
  positions: Sample[];
  speedValid: boolean[];
} {
  const original = samples.slice(start, end);
  const speedValid = original.map((_, index) => index > 0);
  const intervals = original.map((point, index) =>
    index
      ? distance(original[index - 1]!, point) /
        ((point.timestampMs - original[index - 1]!.timestampMs) / 1000)
      : 0,
  );
  // At the end there is no return fix to confirm an excursion. Mark an abrupt,
  // unsupported final interval unavailable instead of manufacturing a speed.
  const lastIndex = original.length - 1;
  if (lastIndex >= 3) {
    const recent = intervals
      .slice(Math.max(1, lastIndex - 5), lastIndex)
      .sort((a, b) => a - b);
    const middle = Math.floor(recent.length / 2);
    const baseline =
      recent.length % 2
        ? recent[middle]!
        : (recent[middle - 1]! + recent[middle]!) / 2;
    if (intervals[lastIndex]! > Math.max(3 * baseline, baseline + 5))
      speedValid[lastIndex] = false;
  }
  if (windowSeconds <= 0) {
    const speedsMps = original.map((point, index) =>
      speedValid[index] ? point.speedMps : 0,
    );
    return {
      speedsMps,
      movementSpeedsMps: speedsMps,
      positions: original,
      speedValid,
    };
  }
  const positions = original.slice();
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
  // The first fix has no observed motion interval yet.
  movementSpeedsMps[0] = 0;
  const first = positions[0]!.timestampMs;
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
  const speedsMps = positions.map((point, index) => {
    if (!speedValid[index]) return 0;
    const right = point.timestampMs;
    const left = Math.max(first, right - widthMs);
    return Math.max(
      0,
      (distanceAt(right, rightCursor) - distanceAt(left, leftCursor)) /
        Math.max(1, (right - left) / 1000),
    );
  });
  return { speedsMps, movementSpeedsMps, positions, speedValid };
}
