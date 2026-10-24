import { describe, it, expect } from "vitest";
import { prepareMotion, bearing, angleBetween } from "../domain/motion";
import { sampleAt } from "../domain/telemetry";
import type { Sample, Track } from "../domain/types";
const point = (i: number, speed = 10): Sample => ({
  timestampMs: i * 1000,
  latitude: 0,
  longitude: i * 0.0001,
  elevation: null,
  speedMps: speed,
  segment: 0,
});
const track = (samples: Sample[]): Track => ({
  name: "t",
  samples,
  startMs: samples[0]!.timestampMs,
  endMs: samples.at(-1)!.timestampMs,
  distanceMeters: 0,
  skippedPoints: 0,
});
describe("motion fitting", () => {
  it("smooths a one-sample spike without changing raw data", () => {
    const raw = track([point(0), point(1), point(2, 30), point(3), point(4)]),
      fit = prepareMotion(raw, 3);
    expect(fit.samples[2]!.speedMps).toBeLessThan(30);
    expect(fit.samples[2]!.speedMps).toBeGreaterThan(10);
    expect(raw.samples[2]!.speedMps).toBe(30);
  });
  it("interpolates smoothly without overshoot or negative speed", () => {
    const fit = prepareMotion(
      track([point(0, 0), point(1, 10), point(2, 12)]),
      0,
    );
    for (let t = 0; t <= 2000; t += 100) {
      const value = sampleAt(fit, t)!.speedMps;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(12);
    }
    expect(sampleAt(fit, 500)!.speedMps).not.toBe(5);
  });
  it("does not smooth across segments or GPS gaps", () => {
    const fit = prepareMotion(
      track([point(0, 0), point(1, 0), { ...point(2, 100), segment: 1 }]),
      60,
    );
    expect(fit.samples[1]!.speedMps).toBe(0);
    expect(sampleAt(fit, 1500)).toBeNull();
  });
  it("uses north zero and clockwise compass bearings", () => {
    expect(bearing(point(0), { ...point(0), latitude: 1 })).toBeCloseTo(0);
    expect(bearing(point(0), point(1))).toBeCloseTo(90);
    expect(bearing(point(0), point(0))).toBeNull();
    expect(angleBetween(359, 1, 0.5)).toBeCloseTo(0);
  });
  it("retains heading while stopped and accumulates distance", () => {
    const fit = prepareMotion(
      track([point(0), point(1), { ...point(1), timestampMs: 2000 }]),
      0,
    );
    expect(fit.samples[2]!.headingDeg).toBeCloseTo(90);
    expect(fit.samples[2]!.distanceMeters).toBeGreaterThan(10);
  });
});
