import { describe, expect, it } from "vitest";
import { buildTrackProfile, profileSpeed } from "../domain/trackProfile";
import type { Sample, Track } from "../domain/types";
import { sampleAt } from "../domain/telemetry";
const point = (seconds: number, values: Partial<Sample> = {}): Sample => ({
  timestampMs: seconds * 1000,
  latitude: 31,
  longitude: 121 + seconds * 0.00001,
  speedMps: 5,
  elevation: 100 + seconds,
  segment: 0,
  ...values,
});
const track = (samples: Sample[]): Track => ({
  name: "ride", samples,
  startMs: samples[0]!.timestampMs,
  endMs: samples.at(-1)!.timestampMs,
  distanceMeters: 0,
  skippedPoints: 0,
  stopThresholdMps: 0.5 / 3.6,
});
describe("preview speed/elevation profile", () => {
  it("uses the prepared speed validity and threshold, retaining genuine zeros", () => {
    const gps = track([point(0), point(1), point(2)]);
    expect(profileSpeed(point(0, { speedValid: false }), gps)).toBeNull();
    expect(profileSpeed(point(0, { speedMps: 0.1 }), gps)).toBe(0);
    expect(profileSpeed(point(0, { speedMps: 0 }), gps)).toBe(0);
    expect(profileSpeed(point(0, { speedMps: 5 }), gps)).toBe(18);
  });
  it("breaks each curve independently for missing readings and GPS outages", () => {
    const gps = track([
      point(0), point(1, { elevation: null, speedValid: false }), point(2),
      point(40), point(41), point(42, { segment: 1 }), point(43, { segment: 1 }),
    ]);
    const graph = buildTrackProfile(gps, 43, 0)!;
    expect(graph.speedPath.match(/M/g)).toHaveLength(4);
    expect(graph.elevationPath.match(/M/g)).toHaveLength(4);
    expect(graph.speedArea.match(/Z/g)).toHaveLength(4);
    expect(sampleAt(gps, 25_000)).toBeNull();
    expect(sampleAt(gps, 41_500)).toBeNull();
  });
  it("clips to video alignment, includes valid interpolated edges and keeps axes finite", () => {
    const gps = track([point(0, { elevation: -10 }), point(10, { elevation: -10 })]);
    const graph = buildTrackProfile(gps, 4, 2)!;
    expect(graph.startMs).toBe(2000);
    expect(graph.endMs).toBe(6000);
    expect(graph.speedPath).toContain("M0.00,");
    expect(graph.speedPath).toContain("L1000.00,");
    expect(graph.elevationScale!.min).toBeLessThan(-10);
    expect(graph.elevationScale!.max).toBeGreaterThan(-10);
    expect(graph.speedPath + graph.elevationPath).not.toMatch(/NaN|Infinity/);
    expect(buildTrackProfile(gps, 4, 20)).toBeNull();
  });
  it("keeps missing altitude unavailable and does not shift the time origin to the first fix", () => {
    const graph = buildTrackProfile(track([point(0, { elevation: null }), point(10, { elevation: null })]), 20, -5)!;
    expect(graph.elevationScale).toBeNull();
    expect(graph.elevationPath).toBe("");
    expect(graph.speedPath).toContain("M250.00,");
    expect(graph.speedPath).toContain("L750.00,");
  });
  it("limits dense curve geometry without discarding a narrow speed peak", () => {
    const gps = track(Array.from({ length: 20_001 }, (_, i) => point(i / 100, {
      speedMps: i === 10_005 ? 40 : 5,
    })));
    const graph = buildTrackProfile(gps, 200, 0)!;
    expect(graph.speedScale.max).toBe(150);
    expect(graph.speedPath.length).toBeLessThan(100_000);
    expect(graph.speedPath).toContain("500.25,10.32");
  });
});
