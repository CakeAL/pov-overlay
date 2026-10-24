import { MAX_GAP_MS, type Sample, type Track } from "./types";
import { sampleAt } from "./telemetry";

export const PROFILE_WIDTH = 1000;
export const PROFILE_HEIGHT = 120;
const PADDING = 6;
export interface ProfileScale {
  min: number;
  max: number;
}
export interface TrackProfile {
  speedPath: string;
  elevationPath: string;
  speedArea: string;
  speedScale: ProfileScale;
  elevationScale: ProfileScale | null;
  startMs: number;
  endMs: number;
}

export function profileSpeed(sample: Sample, track: Track): number | null {
  if (sample.speedValid === false) return null;
  return sample.speedMps < (track.stopThresholdMps ?? 0)
    ? 0
    : sample.speedMps * 3.6;
}
export function profileY(value: number, scale: ProfileScale): number {
  return PADDING +
    (1 - (value - scale.min) / (scale.max - scale.min)) *
      (PROFILE_HEIGHT - 2 * PADDING);
}
function elevationScale(min: number, max: number): ProfileScale | null {
  if (!Number.isFinite(min)) return null;
  const padding = Math.max(1, (max - min) * 0.1);
  return { min: Math.floor(min - padding), max: Math.ceil(max + padding) };
}

/** Cache geometry on data/settings changes; retain both extrema in each pixel bucket. */
export function buildTrackProfile(
  track: Track,
  durationSeconds: number,
  offsetSeconds: number,
): TrackProfile | null {
  if (!track.samples.length || durationSeconds <= 0) return null;
  const startMs = track.startMs + offsetSeconds * 1000;
  const endMs = startMs + durationSeconds * 1000;
  const visible = track.samples.filter(p => p.timestampMs >= startMs && p.timestampMs <= endMs);
  // Include clipped edges only when the existing sampler confirms coverage.
  if (!visible.length || visible[0]!.timestampMs > startMs) {
    const edge = sampleAt(track, startMs);
    if (edge) visible.unshift(edge);
  }
  if (!visible.length || visible.at(-1)!.timestampMs < endMs) {
    const edge = sampleAt(track, endMs);
    if (edge) visible.push(edge);
  }
  if (!visible.length) return null;
  let speedMax = 0, elevationMin = Infinity, elevationMax = -Infinity;
  for (const point of visible) {
    speedMax = Math.max(speedMax, profileSpeed(point, track) ?? 0);
    if (point.elevation != null) {
      elevationMin = Math.min(elevationMin, point.elevation);
      elevationMax = Math.max(elevationMax, point.elevation);
    }
  }
  const speedScale = { min: 0, max: Math.max(10, Math.ceil(speedMax / 10) * 10) };
  const altitudeScale = elevationScale(elevationMin, elevationMax);
  const x = (point: Sample) => (point.timestampMs - startMs) / (endMs - startMs) * PROFILE_WIDTH;
  function paths(
    value: (point: Sample) => number | null,
    scale: ProfileScale,
    fill = false,
  ) {
    const lines: string[] = [], areas: string[] = [];
    let run: Array<{ x: number; y: number }> = [];
    function finish() {
      if (!run.length) return;
      // Bucket consecutive points by x; keep their temporal order and peaks.
      const selected: typeof run = [];
      for (let i = 0; i < run.length;) {
        let end = i + 1, low = i, high = i;
        while (end < run.length && Math.floor(run[end]!.x) === Math.floor(run[i]!.x)) {
          if (run[end]!.y < run[low]!.y) low = end;
          if (run[end]!.y > run[high]!.y) high = end;
          end++;
        }
        for (const index of [...new Set([i, low, high, end - 1])].sort((a, b) => a - b))
          selected.push(run[index]!);
        i = end;
      }
      const line = selected.map((point, i) => `${i ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
      lines.push(line);
      if (fill) areas.push(`${line} L${selected.at(-1)!.x.toFixed(2)},${PROFILE_HEIGHT} L${selected[0]!.x.toFixed(2)},${PROFILE_HEIGHT} Z`);
      run = [];
    }
    let previous: Sample | undefined;
    for (const point of visible) {
      if (previous && (point.segment !== previous.segment || point.timestampMs - previous.timestampMs > MAX_GAP_MS)) finish();
      const current = value(point);
      if (current == null) finish();
      else run.push({ x: x(point), y: profileY(current, scale) });
      previous = point;
    }
    finish();
    return { line: lines.join(" "), area: areas.join(" ") };
  }
  const speed = paths(point => profileSpeed(point, track), speedScale, true);
  const altitude = altitudeScale
    ? paths(point => point.elevation, altitudeScale)
    : { line: "", area: "" };
  return {
    speedPath: speed.line,
    elevationPath: altitude.line,
    speedArea: speed.area,
    speedScale,
    elevationScale: altitudeScale,
    startMs,
    endMs,
  };
}
