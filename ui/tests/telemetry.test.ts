import { parseGpx } from "../infrastructure/gpx";
import { describe, expect, it } from "vitest";
import {
  alignmentOffset,
  formatCoordinate,
  sampleAt,
} from "../domain/telemetry";
const start = Date.parse("2026-10-24T00:00:00Z");
const point = (seconds: number, lat = 31 + seconds * 0.00001, lon = 121) =>
  `<trkpt lat="${lat}" lon="${lon}"><time>${new Date(start + seconds * 1000).toISOString()}</time></trkpt>`;
const gpx = (points: string) =>
  `<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Test ride</name><trkseg>${points}</trkseg></trk></gpx>`;
describe("GPX timeline", () => {
  it("retains the first sample and derives speed in meters per second", () => {
    const track = parseGpx(gpx(point(0) + point(1)));
    expect(track.startMs).toBe(start);
    expect(track.samples).toHaveLength(2);
    expect(track.samples[0]!.speedMps).toBeCloseTo(1.112, 2);
    expect(track.samples[0]!.elevation).toBeNull();
    expect(track.distanceMeters).toBeCloseTo(1.112, 2);
  });
  it("sorts timestamps, removes duplicates, and skips points without timestamps", () => {
    const track = parseGpx(
      gpx(point(1) + point(0) + point(0) + '<trkpt lat="31" lon="121"/>'),
    );
    expect(track.samples).toHaveLength(2);
    expect(track.skippedPoints).toBe(2);
  });
  it("interpolates at arbitrary video times, including sub-second seeking", () => {
    const track = parseGpx(gpx(point(0) + point(2)));
    expect(sampleAt(track, start + 500)?.latitude).toBeCloseTo(31.000005, 8);
    expect(sampleAt(track, start + 2000)?.latitude).toBeCloseTo(31.00002, 8);
  });
  it("does not freeze a sample outside GPX coverage", () => {
    const track = parseGpx(gpx(point(0) + point(1)));
    expect(sampleAt(track, start - 1)).toBeNull();
    expect(sampleAt(track, start + 1001)).toBeNull();
  });
  it("does not bridge GPS outages or track segment boundaries", () => {
    const outage = parseGpx(gpx(point(0) + point(60)));
    expect(sampleAt(outage, start + 30_000)).toBeNull();
    const segments = parseGpx(gpx(point(0) + "</trkseg><trkseg>" + point(1)));
    expect(sampleAt(segments, start + 500)).toBeNull();
    expect(segments.distanceMeters).toBe(0);
  });
  it("interpolates across the antimeridian in the short direction", () => {
    const track = parseGpx(gpx(point(0, 0, 179.9) + point(1, 0, -179.9)));
    expect(Math.abs(sampleAt(track, start + 500)!.longitude)).toBeCloseTo(
      180,
      8,
    );
  });
  it("rejects malformed, insufficient, and timezone-ambiguous tracks", () => {
    expect(() => parseGpx("hello")).toThrow();
    expect(() => parseGpx(gpx(point(0)))).toThrow();
    expect(() =>
      parseGpx(
        gpx(point(0).replace(".000Z", "") + point(1).replace(".000Z", "")),
      ),
    ).toThrow();
  });
});
describe("video alignment", () => {
  it("aligns video beginning 12.5 seconds into GPX, regardless of timezone", () => {
    const track = parseGpx(gpx(point(0) + point(20)));
    const offset = alignmentOffset(
      track,
      Date.parse("2026-10-24T08:00:12.500+08:00"),
    );
    expect(offset).toBe(12.5);
    expect(
      sampleAt(track, track.startMs + (offset + 0.25) * 1000)?.latitude,
    ).toBeCloseTo(31.0001275, 8);
  });
  it("represents videos that start before GPX with a negative offset", () => {
    const track = parseGpx(gpx(point(0) + point(20)));
    expect(alignmentOffset(track, start - 5000)).toBe(-5);
    expect(sampleAt(track, start - 5000)).toBeNull();
  });
  it("formats longitude and latitude hemispheres independently", () => {
    expect(formatCoordinate(-12.5, "lat")).toBe("12.500000° S");
    expect(formatCoordinate(-121.5, "lon")).toBe("121.500000° W");
    expect(formatCoordinate(undefined, "lat")).toBe("—");
  });
});
