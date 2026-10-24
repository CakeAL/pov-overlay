import type { Track } from "./types";

/** Fixed offsets for correcting local clock values incorrectly tagged as UTC. */
export const trackTimeOffsets = Array.from(
  new Set([
    ...Array.from({ length: 27 }, (_, index) => (index - 12) * 60),
    -570,
    -210,
    210,
    270,
    330,
    345,
    390,
    525,
    570,
    630,
    765,
  ]),
).sort((a, b) => a - b);

export function validTrackTimeOffset(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= -720 &&
    value <= 840 &&
    value % 15 === 0
  );
}

export function utcOffsetLabel(minutes: number): string {
  const absolute = Math.abs(minutes);
  return `UTC${minutes < 0 ? "−" : "+"}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}

/** Keep imported timestamps intact so repeated corrections never accumulate. */
export function correctTrackTime(
  track: Track,
  utcLabelOffsetMinutes?: number | null,
): Track {
  if (utcLabelOffsetMinutes == null) return track;
  if (!validTrackTimeOffset(utcLabelOffsetMinutes))
    throw new Error("GPX 时区偏移无效。");
  const shiftMs = utcLabelOffsetMinutes * 60_000;
  if (!shiftMs) return track;
  if (track.startMs - shiftMs < -8.64e15 || track.endMs - shiftMs > 8.64e15)
    throw new Error("校正后的 GPX 时间超出范围。");
  return {
    ...track,
    startMs: track.startMs - shiftMs,
    endMs: track.endMs - shiftMs,
    samples: track.samples.map((sample) => ({
      ...sample,
      timestampMs: sample.timestampMs - shiftMs,
    })),
  };
}
