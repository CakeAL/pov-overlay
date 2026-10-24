import type { Sample } from "./types";
import { distance } from "./geography";

export const DEFAULT_SMOOTHING_POINTS = 7;
export const MAX_SMOOTHING_POINTS = 61;

/** A centered window needs an odd count; zero explicitly disables smoothing. */
export function normalizeSmoothingPoints(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SMOOTHING_POINTS;
  if (value <= 0) return 0;
  return Math.min(
    MAX_SMOOTHING_POINTS,
    Math.max(3, 2 * Math.floor(value / 2) + 1),
  );
}

/**
 * Distance / elapsed time in a centered window, with isolated detour rejection.
 * Reference: https://github.com/gpxstudio/gpx.studio/blob/main/gpx/src/gpx.ts#L906-L922
 * Upstream uses time windows; here the caller chooses an odd point count.
 * Independently implemented; no upstream source is copied.
 */
export function estimateSegmentSpeed(
  samples: Sample[],
  start: number,
  end: number,
  windowPoints: number,
): {
  speedsMps: number[];
  movementSpeedsMps: number[];
  positions: Sample[];
  speedValid: boolean[];
} {
  const count = normalizeSmoothingPoints(windowPoints);
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
  if (count === 0) {
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
  // Exclude an unsupported last interval from every centered window, not just
  // from the final readout, so its distance cannot leak into earlier estimates.
  const lastUsable = speedValid[lastIndex]
    ? lastIndex
    : Math.max(0, lastIndex - 1);
  const radius = (count - 1) / 2;
  const speedsMps = positions.map((_, index) => {
    if (!speedValid[index]) return 0;
    const left = Math.max(0, index - radius);
    const right = Math.min(lastUsable, index + radius);
    const elapsedSeconds =
      (positions[right]!.timestampMs - positions[left]!.timestampMs) / 1000;
    return Math.max(
      0,
      (cumulative[right]! - cumulative[left]!) / Math.max(1, elapsedSeconds),
    );
  });
  return { speedsMps, movementSpeedsMps, positions, speedValid };
}
