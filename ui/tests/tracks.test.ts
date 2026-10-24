import { describe, it, expect } from "vitest";
import { mergeTracks } from "../domain/mergeTracks";
import { routePreview, coverageIntervals } from "../domain/routePreview";
import { sampleAt } from "../domain/telemetry";
import type { TrackSource, Track, Sample } from "../domain/types";
const p = (t: number, lon = t * 0.00001, segment = 0): Sample => ({
  timestampMs: t * 1000,
  latitude: 0,
  longitude: lon,
  elevation: null,
  speedMps: 0,
  segment,
});
const t = (samples: Sample[]): Track => ({
  name: "test",
  samples,
  startMs: samples[0]!.timestampMs,
  endMs: samples.at(-1)!.timestampMs,
  distanceMeters: 0,
  skippedPoints: 0,
});
const source = (id: string, samples: Sample[]): TrackSource => ({
  id,
  name: id,
  track: t(samples),
});
describe("multiple GPX sources", () => {
  it("orders by absolute time and connects reasonable adjacent files", () => {
    const result = mergeTracks([
      source("b", [p(2), p(3)]),
      source("a", [p(0), p(1)]),
    ]);
    expect(result.track!.samples.map((p) => p.timestampMs)).toEqual([
      0, 1000, 2000, 3000,
    ]);
    expect(result.breaks).toBe(0);
    expect(result.track!.distanceMeters).toBeGreaterThan(3);
  });
  it("replaces the entire overlapping interval with the later source", () => {
    const result = mergeTracks([
      source("a", [p(0), p(1), p(2), p(3)]),
      source("b", [p(0.5), p(2.5)]),
    ]);
    expect(result.track!.samples.map((p) => p.timestampMs)).toEqual([
      0, 500, 2500, 3000,
    ]);
    expect(result.overwritten).toBe(2);
  });
  it("preserves time gaps, explicit segment breaks and implausible jumps", () => {
    const result = mergeTracks([
      source("a", [p(0), p(1)]),
      source("b", [p(60), p(61)]),
    ]);
    expect(sampleAt(result.track!, 30000)).toBeNull();
    expect(coverageIntervals(result.track!)).toHaveLength(2);
    expect(
      mergeTracks([source("a", [p(0), p(1), p(2, 0.00002, 1)])]).breaks,
    ).toBe(1);
    expect(
      mergeTracks([
        source("a", [p(0), p(1)]),
        source("b", [p(2, 50), p(3, 50)]),
      ]).breaks,
    ).toBe(1);
  });
  it("can disable a source or avoid joining files", () => {
    expect(
      mergeTracks([{ ...source("a", [p(0), p(1)]), enabled: false }]).track,
    ).toBeNull();
    expect(
      mergeTracks([source("a", [p(0), p(1)]), source("b", [p(2), p(3)])], false)
        .breaks,
    ).toBe(1);
  });
});
describe("route preview geometry", () => {
  it("keeps geographic proportions instead of stretching each axis", () => {
    const preview = routePreview(
      t([p(0, 0), { ...p(1, 0.001), latitude: 0.001 }]),
      200,
      100,
      10,
    );
    const start = preview.point(p(0, 0)),
      end = preview.point({ ...p(1, 0.001), latitude: 0.001 });
    expect(Math.abs(end.x - start.x)).toBeCloseTo(Math.abs(end.y - start.y), 3);
  });
  it("does not draw lines across missing segments and handles the date line", () => {
    const points = [
      { ...p(0, 179.9) },
      { ...p(1, -179.9) },
      { ...p(2, -179.8), segment: 1 },
    ];
    const preview = routePreview(t(points));
    expect((preview.path.match(/M/g) || []).length).toBe(2);
    expect(preview.path).not.toContain("NaN");
    expect(preview.path).not.toContain("Infinity");
  });
});

describe("GPX UTC label correction", () => {
  it.each([480, -210, 345])(
    "applies UTC offset %s minutes without mutating samples",
    (offset) => {
      const start = Date.parse("2026-10-22T18:39:45.123Z");
      const original = source("a", [p(start / 1000), p(start / 1000 + 1)]);
      const result = mergeTracks([
        { ...original, utcLabelOffsetMinutes: offset },
      ]);
      expect(result.track!.startMs).toBe(start - offset * 60_000);
      expect(result.track!.endMs - result.track!.startMs).toBe(1000);
      expect(original.track.startMs).toBe(start);
      expect(original.track.samples[0]!.timestampMs).toBe(start);
      expect(result.track!.distanceMeters).toBeGreaterThan(0);
    },
  );
  it("corrects each source before sorting and replacing overlapping samples", () => {
    const first = source("a", [p(0), p(1), p(2), p(3)]);
    const second = {
      ...source("b", [p(28801.5, 0.000015), p(28802.5, 0.000025)]),
      utcLabelOffsetMinutes: 480,
    };
    const merged = mergeTracks([first, second]);
    expect(merged.track!.samples.map((p) => p.timestampMs)).toEqual([
      0, 1000, 1500, 2500, 3000,
    ]);
    expect(merged.overwritten).toBe(1);
  });
});
