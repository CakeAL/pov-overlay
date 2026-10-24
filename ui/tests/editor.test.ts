import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";
import { provideEditor } from "../editor/context";
import type { Editor } from "../editor/createEditor";
import { parseGpx } from "../infrastructure/gpx";
import type { VideoAsset } from "../domain/types";

const cleanup: Array<() => void> = [];
afterEach(() => {
  cleanup.splice(0).forEach((stop) => stop());
  vi.unstubAllGlobals();
});
function session() {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  let editor!: Editor;
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup() {
      editor = provideEditor();
      return () => h("div");
    },
  });
  app.mount(host);
  cleanup.push(() => {
    app.unmount();
    host.remove();
  });
  return editor;
}
const track = () =>
  parseGpx(
    `<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg><trkpt lat="31" lon="121"><time>2026-10-24T00:00:00Z</time></trkpt><trkpt lat="31.0002" lon="121"><time>2026-10-24T00:00:20Z</time></trkpt></trkseg></trk></gpx>`,
  );
const video = (capturedAtMs: number | null): VideoAsset => ({
  name: "ride.mp4",
  url: "/ride.mp4",
  capturedAtMs,
  timeSource: capturedAtMs === null ? null : "metadata",
  warning: null,
  duration: 8,
});
function inputEvent(value: string) {
  const target = document.createElement("input");
  target.value = value;
  return { target } as unknown as Event;
}

describe("editor feature coordination", () => {
  it.each(["track-first", "video-first"])(
    "automatically aligns %s imports through independent controllers",
    async (order) => {
      const editor = session(),
        gps = track(),
        asset = video(gps.startMs + 12_500);
      if (order === "track-first") {
        editor.media.acceptTrack({ track: gps, name: "ride.gpx" });
        await editor.media.acceptVideo(asset);
      } else {
        await editor.media.acceptVideo(asset);
        editor.media.acceptTrack({ track: gps, name: "ride.gpx" });
      }
      expect(editor.alignment.offset).toBe(12.5);
      expect(editor.alignment.syncMode).toBe("auto");
      expect(editor.timeline.sample?.latitude).toBeCloseTo(31.000125, 8);
      editor.playback.seek(1.5);
      expect(editor.timeline.sample?.latitude).toBeCloseTo(31.00014, 8);
    },
  );
  it("requires explicit alignment without metadata, and clears stale readings on replacement", async () => {
    const editor = session(),
      gps = track();
    editor.media.acceptTrack({ track: gps, name: "ride.gpx" });
    await editor.media.acceptVideo(video(gps.startMs));
    expect(editor.timeline.sample).not.toBeNull();
    await editor.media.acceptVideo(video(null));
    expect(editor.alignment.alignmentKnown).toBe(false);
    expect(editor.alignment.showTiming).toBe(true);
    expect(editor.timeline.sample).toBeNull();
    editor.alignment.setManualOffset(inputEvent("12.5"));
    expect(editor.timeline.sample?.timestampMs).toBe(gps.startMs + 12_500);
    editor.alignment.setManualOffset(inputEvent("200"));
    expect(editor.timeline.sample).toBeNull();
  });
  it("preserves layout history and selected-property edits across extracted panels", () => {
    const editor = session(),
      initialX = editor.layout.widgets[0]!.x;
    editor.layout.remember();
    editor.layout.updatePosition("x", inputEvent("25"));
    expect(editor.layout.selected?.x).toBe(0.25);
    editor.layout.undo();
    expect(editor.layout.selected?.x).toBe(initialX);
    editor.layout.redo();
    expect(editor.layout.selected?.x).toBe(0.25);
    editor.layout.toggleLock(editor.layout.widgets[0]!);
    editor.layout.updatePosition("x", inputEvent("40"));
    expect(editor.layout.selected?.x).toBe(0.25);
    editor.layout.toggleVisible(editor.layout.widgets[0]!);
    expect(editor.layout.selected?.visible).toBe(false);
  });
  it("keeps editor sessions isolated instead of sharing mutable module state", async () => {
    const first = session(),
      second = session();
    first.media.acceptTrack({ track: track(), name: "first.gpx" });
    first.layout.widgets[0]!.x = 0.25;
    await nextTick();
    expect(second.media.track).toBeNull();
    expect(second.layout.widgets[0]!.x).toBe(0.055);
  });
});

it("restores project time after background and track watchers settle", async () => {
  const editor = session();
  editor.media.acceptTrack({ track: track(), name: "ride.gpx" });
  await nextTick();
  editor.playback.seek(5.25);
  const data = editor.documents.project();
  editor.playback.seek(0);
  await editor.documents.load(JSON.stringify(data), "project");
  await nextTick();
  expect(editor.playback.currentTime).toBe(5.25);
  expect(editor.media.sources).toHaveLength(1);
});
it("runs the independent GPX clock without a video element", async () => {
  let callback: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    callback = fn;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const editor = session();
  editor.media.acceptTrack({ track: track(), name: "ride.gpx" });
  await nextTick();
  await editor.playback.togglePlay();
  callback!(performance.now() + 500);
  expect(editor.playback.currentTime).toBeGreaterThan(0.45);
  expect(editor.playback.playing).toBe(true);
  await editor.playback.togglePlay();
  expect(editor.playback.playing).toBe(false);
});

it("preserves unresolved video references when a restored project is saved again", async () => {
  const editor = session();
  editor.media.acceptTrack({ track: track(), name: "ride.gpx" });
  await editor.media.acceptVideo(video(editor.media.track!.startMs + 2000));
  editor.alignment.setManualOffset(inputEvent("2.5"));
  editor.playback.seek(3);
  const saved = editor.documents.project();
  await editor.documents.load(JSON.stringify(saved), "project");
  await nextTick();
  const again = editor.documents.project();
  expect(again.video?.name).toBe("ride.mp4");
  expect(again.video?.duration).toBe(8);
  expect(again.backgroundMode).toBe("video");
  expect(again.offset).toBe(2.5);
  expect(again.currentTime).toBe(3);
});
