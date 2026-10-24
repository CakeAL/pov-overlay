import { describe, it, expect } from "vitest";
import { prepareMotion, bearing, angleBetween } from "../domain/motion";
import { sampleAt } from "../domain/telemetry";
import { mergeTracks } from "../domain/mergeTracks";
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
      track([
        point(0, 0),
        { ...point(1, 0), longitude: 0 },
        { ...point(2, 100), segment: 1 },
      ]),
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

it("zeros drift after interpolation and holds heading deterministically during stops", () => {
  const raw = track([
    point(0, 2),
    point(1, 2),
    { ...point(2, 0.1), latitude: 0.00001, longitude: 0.0001 },
    { ...point(3, 0.1), latitude: 0.00002, longitude: 0.0001 },
    { ...point(4, 2), latitude: 0.0001, longitude: 0.0001 },
  ]);
  const fit = prepareMotion(raw, 0, 0.5);
  const stopped = sampleAt(fit, 2500)!;
  expect(stopped.speedMps).toBe(0);
  expect(stopped.headingDeg).toBeCloseTo(90);
  sampleAt(fit, 4000);
  expect(sampleAt(fit, 2500)!.headingDeg).toBeCloseTo(90);
  expect(sampleAt(fit, 3000)!.speedMps).toBe(0);
  expect(sampleAt(prepareMotion(raw, 0, 0), 2500)!.speedMps).toBeCloseTo(0.1);
  expect(raw.samples[2]!.speedMps).toBe(0.1);
});
it("does not borrow a heading from future movement or previous segments while stationary", () => {
  const fit = prepareMotion(
    track([
      point(0, 0.1),
      point(1, 0.1),
      point(2, 2),
      { ...point(3, 0.1), segment: 1 },
      { ...point(4, 0.1), segment: 1 },
    ]),
    0,
    0.5,
  );
  expect(sampleAt(fit, 0)!.headingDeg).toBeNull();
  expect(sampleAt(fit, 500)!.headingDeg).toBeNull();
  expect(sampleAt(fit, 3500)!.headingDeg).toBeNull();
});

const metersPoint = (seconds: number, east: number, north = 0): Sample => ({
  timestampMs: seconds * 1000,
  latitude: ((north / 6371008.8) * 180) / Math.PI,
  longitude: ((east / 6371008.8) * 180) / Math.PI,
  elevation: null,
  speedMps: 0,
  segment: 0,
});
const measuredTrack = (points: Sample[]): Track =>
  mergeTracks([
    { id: "recording", name: "recording.gpx", track: track(points) },
  ]).track!;
it("does not amplify a millisecond GPS fix into a large speed spike", () => {
  const raw = measuredTrack([
    metersPoint(0, 0),
    metersPoint(1, 10),
    metersPoint(1.001, 11),
    metersPoint(2, 20),
    metersPoint(3, 30),
    metersPoint(4, 40),
  ]);
  expect(raw.samples[2]!.speedMps).toBeGreaterThan(900);
  const fit = prepareMotion(raw, 3);
  for (let time = 0; time <= 4000; time += 100)
    expect(sampleAt(fit, time)!.speedMps).toBeCloseTo(10, 4);
});
it("rejects an isolated GPS excursion without altering the source or inventing a turn", () => {
  const raw = measuredTrack(
    Array.from({ length: 7 }, (_, i) =>
      metersPoint(i, 10 * i, i === 3 ? 100 : 0),
    ),
  );
  expect(raw.samples[3]!.speedMps).toBeGreaterThan(100);
  const fit = prepareMotion(raw, 3, 0.5);
  expect(fit.samples[3]!.speedMps).toBeCloseTo(10, 4);
  expect(fit.samples[3]!.headingDeg).toBeCloseTo(90, 3);
  expect(raw.samples[3]!.latitude).toBeGreaterThan(0.0008);
  expect(fit.samples[3]!.latitude).toBe(raw.samples[3]!.latitude);
});
it("retains real sustained high speed and measures road distance around a bend", () => {
  const fast = prepareMotion(
    measuredTrack(Array.from({ length: 7 }, (_, i) => metersPoint(i, 40 * i))),
    3,
  );
  expect(fast.samples[3]!.speedMps).toBeCloseTo(40, 4);
  const turn = prepareMotion(
    measuredTrack([
      metersPoint(0, 0),
      metersPoint(1, 10),
      metersPoint(2, 10, 10),
      metersPoint(3, 20, 10),
    ]),
    3,
  );
  expect(turn.samples[1]!.speedMps).toBeCloseTo(10, 4);
});

it("does not borrow speed before the second fix of a new segment", () => {
  const prepared = prepareMotion(
    measuredTrack([metersPoint(0, 0), metersPoint(1, 1), metersPoint(2, 2)]),
    3,
  );
  expect(sampleAt(prepared, 0)!.speedValid).toBe(false);
  expect(sampleAt(prepared, 500)!.speedValid).toBe(false);
  expect(sampleAt(prepared, 1000)!.speedValid).toBe(true);
  expect(sampleAt(prepared, 0)!.headingDeg).toBeNull();
  const isolated = prepareMotion(
    measuredTrack([metersPoint(0, 0), metersPoint(60, 1), metersPoint(61, 2)]),
    3,
  );
  expect(sampleAt(isolated, 0)).toBeNull();
  expect(sampleAt(isolated, 60_000)!.speedValid).toBe(false);
});
