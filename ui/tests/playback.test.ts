import { describe, expect, it } from "vitest";
import {
  playbackSample,
  quantizeElapsed,
  sampleInterval,
} from "../domain/playbackSample";
import type { Sample, Track } from "../domain/types";

const point = (timestampMs: number, latitude: number): Sample => ({
  timestampMs,
  latitude,
  longitude: 121,
  elevation: null,
  speedMps: 10,
  segment: 0,
});
const track = (): Track => ({
  name: "ride",
  samples: [0, 1000, 2000, 3000, 4000].map((ms) => point(ms, 31 + ms / 1e6)),
  startMs: 0,
  endMs: 4000,
  distanceMeters: 0,
  skippedPoints: 0,
});

describe("data refresh cadence", () => {
  it("clamps the configured interval to the supported range", () => {
    expect(sampleInterval(0)).toBe(0.2);
    expect(sampleInterval(Number.NaN)).toBe(0.2);
    expect(sampleInterval(0.001)).toBe(0.01);
    expect(sampleInterval(20)).toBe(10);
    expect(sampleInterval(0.16666666666666666)).toBe(0.16666666666666666);
  });
  it("keeps samples stable within a refresh window and advances at its boundary", () => {
    expect(playbackSample(track(), 0.05, 0, 0.2)!.timestampMs).toBe(0);
    expect(playbackSample(track(), 0.19, 0, 0.2)!.timestampMs).toBe(0);
    expect(playbackSample(track(), 0.21, 0, 0.2)!.timestampMs).toBe(200);
  });
  it("handles a repeating one-sixth interval without drifting", () => {
    const interval = 1 / 6;
    expect(quantizeElapsed(0.17, interval)).toBeCloseTo(interval, 12);
    expect(quantizeElapsed(1, interval)).toBeCloseTo(1, 12);
    expect(playbackSample(track(), 0.17, 0, interval)!.timestampMs).toBeCloseTo(
      1000 / 6,
      6,
    );
    expect(playbackSample(track(), 1.01, 0, interval)!.timestampMs).toBeCloseTo(
      1000,
      6,
    );
  });
});
