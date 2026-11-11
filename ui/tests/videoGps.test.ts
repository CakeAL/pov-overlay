import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { MediaSession } from "../composables/useMediaSession";
import type { EditorMessages } from "../composables/useMessages";
import type { Track, VideoAsset } from "../domain/types";

vi.mock("../infrastructure/videoGps", () => ({
  exportNativeVideoGps: vi.fn(),
}));
vi.mock("../infrastructure/media", () => ({ importNativeGpx: vi.fn() }));

import { exportNativeVideoGps } from "../infrastructure/videoGps";
import { importNativeGpx } from "../infrastructure/media";
import { useVideoGps } from "../composables/useVideoGps";

const videoStart = Date.parse("2026-10-27T10:22:04Z");
const trackAt = (startMs: number): Track => ({
  name: "clip",
  startMs,
  endMs: startMs + 4000,
  distanceMeters: 10,
  skippedPoints: 0,
  samples: [],
});
const asset = (): VideoAsset => ({
  name: "clip.mp4",
  path: "/videos/clip.mp4",
  url: "/videos/clip.mp4",
  capturedAtMs: videoStart,
  timeSource: "metadata",
  warning: null,
  duration: 120,
});
function setup(options: { path?: boolean } = {}) {
  const media = {
    asset: ref<VideoAsset | null>({ ...asset(), path: options.path === false ? undefined : "/videos/clip.mp4" }),
    acceptTrack: vi.fn(),
  } as unknown as MediaSession;
  const messages = {
    error: ref(""),
    warning: ref(""),
    notice: ref(""),
    clear: vi.fn(),
    report: vi.fn(),
  } as unknown as EditorMessages;
  return { media, messages, gps: useVideoGps(media, messages) };
}
const exported = (supportedModel = true) => ({
  gpxPath: "/videos/clip.gpx",
  pointCount: 1234,
  rawPointCount: 12_340,
  cameraName: "DJI OsmoAction6",
  protoName: supportedModel ? "dvtm_ac206.proto" : "dvtm_other.proto",
  skippedSamples: 0,
  supportedModel,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("video GPS export", () => {
  it("loads the exported GPX and corrects a local clock tagged as UTC", async () => {
    const { media, messages, gps } = setup();
    vi.mocked(importNativeGpx).mockResolvedValue({
      track: trackAt(videoStart + 480 * 60_000 + 1200),
      name: "clip.gpx",
    });
    vi.mocked(exportNativeVideoGps).mockResolvedValue(exported());

    await gps.exportGpx();

    expect(exportNativeVideoGps).toHaveBeenCalledWith("/videos/clip.mp4");
    expect(importNativeGpx).toHaveBeenCalledWith("/videos/clip.gpx");
    expect(media.acceptTrack).toHaveBeenCalledWith(
      expect.objectContaining({ name: "clip.gpx" }),
      480,
    );
    expect(messages.notice.value).toContain("轨迹点");
    expect(messages.notice.value).toContain("UTC+08:00");
    expect(messages.warning.value).toBe("");
    expect(gps.busy.value).toBe(false);
  });

  it("keeps the file clock when video and GPS times already agree", async () => {
    const { media, messages, gps } = setup();
    vi.mocked(importNativeGpx).mockResolvedValue({
      track: trackAt(videoStart + 1200),
      name: "clip.gpx",
    });
    vi.mocked(exportNativeVideoGps).mockResolvedValue(exported());

    await gps.exportGpx();

    expect(media.acceptTrack).toHaveBeenCalledWith(
      expect.objectContaining({ name: "clip.gpx" }),
      null,
    );
    expect(messages.notice.value).not.toContain("校正");
  });

  it("does nothing when the save dialog is cancelled or the video has no path", async () => {
    const first = setup();
    vi.mocked(exportNativeVideoGps).mockResolvedValue(null);
    await first.gps.exportGpx();
    expect(importNativeGpx).not.toHaveBeenCalled();
    expect(first.media.acceptTrack).not.toHaveBeenCalled();

    vi.clearAllMocks();
    const second = setup({ path: false });
    await second.gps.exportGpx();
    expect(exportNativeVideoGps).not.toHaveBeenCalled();
    expect(second.gps.busy.value).toBe(false);
  });

  it("warns for unverified models and reports extraction failures", async () => {
    const unverified = setup();
    vi.mocked(importNativeGpx).mockResolvedValue({
      track: trackAt(videoStart),
      name: "clip.gpx",
    });
    vi.mocked(exportNativeVideoGps).mockResolvedValue(exported(false));
    await unverified.gps.exportGpx();
    expect(unverified.messages.warning.value).toContain("Action 4/5/6");

    const failed = setup();
    const error = new Error("该视频没有 DJI GPS 元数据");
    vi.mocked(exportNativeVideoGps).mockRejectedValue(error);
    await failed.gps.exportGpx();
    expect(failed.messages.report).toHaveBeenCalledWith(error);
    expect(failed.messages.notice.value).toBe("");
    expect(failed.gps.busy.value).toBe(false);
  });
});
