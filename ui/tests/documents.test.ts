// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { parseDocument } from "../infrastructure/documents/schema";
import { defaultWidgets } from "../domain/types";
const preset = () => ({
  type: "pov-overlay/preset",
  version: 1,
  name: "ride",
  widgets: defaultWidgets(),
  smoothingSeconds: 3,
  refreshSeconds: 0.1,
  aspectRatio: 16 / 9,
});
describe("project and preset validation", () => {
  it("round-trips presets without telemetry data", () => {
    expect(parseDocument(JSON.stringify(preset()), "preset").widgets).toEqual(
      defaultWidgets(),
    );
  });
  it("rejects wrong versions, invalid numbers, duplicate ids and SVG injection", () => {
    expect(() =>
      parseDocument(JSON.stringify({ ...preset(), version: 9 }), "preset"),
    ).toThrow();
    expect(() =>
      parseDocument(
        JSON.stringify({ ...preset(), refreshSeconds: 0 }),
        "preset",
      ),
    ).toThrow();
    const bad = preset();
    bad.widgets.push(bad.widgets[0]!);
    expect(() => parseDocument(JSON.stringify(bad), "preset")).toThrow();
  });
  it("round-trips an empty project without persisting transient blob URLs", () => {
    const p = {
      ...preset(),
      type: "pov-overlay/project",
      tracks: [],
      image: null,
      video: {
        name: "clip.mp4",
        capturedAtMs: null,
        timeSource: null,
        duration: 12,
      },
      backgroundMode: "none",
      currentTime: 0,
      offset: 0,
      alignmentKnown: false,
      syncMode: "none",
    };
    const value = parseDocument(JSON.stringify(p), "project");
    expect(value.video?.name).toBe("clip.mp4");
    expect(value.video).not.toHaveProperty("url");
  });
  it("rejects remote images and malformed track timestamps", () => {
    const p = {
      ...preset(),
      type: "pov-overlay/project",
      tracks: [],
      image: {
        name: "x",
        url: "https://example.com/x.png",
        width: 100,
        height: 100,
      },
      video: null,
      backgroundMode: "image",
      currentTime: 0,
      offset: 0,
      alignmentKnown: false,
      syncMode: "none",
    };
    expect(() => parseDocument(JSON.stringify(p), "project")).toThrow();
  });
});

it("validates source time-zone corrections and defaults older projects to file times", () => {
  const startMs = Date.parse("2026-10-22T18:39:45Z");
  const source = {
    id: "ride",
    name: "ride.gpx",
    track: {
      name: "ride",
      distanceMeters: 0,
      skippedPoints: 0,
      samples: [0, 1000].map((dt) => ({
        timestampMs: startMs + dt,
        latitude: 31,
        longitude: 121,
        elevation: null,
        speedMps: 0,
        segment: 0,
      })),
    },
  };
  const project = {
    ...preset(),
    type: "pov-overlay/project",
    tracks: [source],
    image: null,
    video: null,
    backgroundMode: "none",
    currentTime: 0,
    offset: 0,
    alignmentKnown: false,
    syncMode: "none",
  };
  expect(
    parseDocument(JSON.stringify(project), "project").tracks[0]!
      .utcLabelOffsetMinutes,
  ).toBeNull();
  const corrected = {
    ...project,
    tracks: [{ ...source, utcLabelOffsetMinutes: 480 }],
  };
  const restored = parseDocument(JSON.stringify(corrected), "project")
    .tracks[0]!;
  expect(restored.utcLabelOffsetMinutes).toBe(480);
  expect(restored.track.startMs).toBe(startMs);
  for (const invalid of [900, -780, 8.5, "480", 481]) {
    expect(() =>
      parseDocument(
        JSON.stringify({
          ...project,
          tracks: [{ ...source, utcLabelOffsetMinutes: invalid }],
        }),
        "project",
      ),
    ).toThrow("GPX 时区偏移无效");
  }
});

it("persists the stop threshold and defaults older presets without accepting invalid thresholds", () => {
  expect(
    parseDocument(JSON.stringify(preset()), "preset").stopThresholdKmh,
  ).toBe(0.5);
  expect(
    parseDocument(
      JSON.stringify({ ...preset(), stopThresholdKmh: 1.2 }),
      "preset",
    ).stopThresholdKmh,
  ).toBe(1.2);
  expect(() =>
    parseDocument(
      JSON.stringify({ ...preset(), stopThresholdKmh: -1 }),
      "preset",
    ),
  ).toThrow();
});
