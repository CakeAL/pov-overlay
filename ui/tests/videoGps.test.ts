import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { MediaSession } from "../composables/useMediaSession";
import type { EditorMessages } from "../composables/useMessages";
import type { Track, VideoAsset } from "../domain/types";

vi.mock("../infrastructure/videoGps", () => ({
  extractNativeVideoGps: vi.fn(),
  saveNativeVideoGps: vi.fn(),
}));

import {
  extractNativeVideoGps,
  saveNativeVideoGps,
} from "../infrastructure/videoGps";
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
const asset = (path: string | undefined = "/videos/clip.mp4"): VideoAsset => ({
  name: "clip.mp4",
  path,
  url: path ?? "",
  capturedAtMs: videoStart,
  timeSource: "metadata",
  warning: null,
  duration: 120,
});
function setup(options: { path?: string } = {}) {
  const media = {
    asset: ref<VideoAsset | null>(asset(options.path)),
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
const exported = (
  supportedModel = true,
  startMs = videoStart + 480 * 60_000 + 1200,
) => ({
  track: trackAt(startMs),
  gpx: "<gpx>extracted</gpx>",
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

describe("video GPS import", () => {
  it("adds the extracted track to the project and corrects a local clock tagged as UTC", async () => {
    const { media, messages, gps } = setup();
    const data = exported();
    vi.mocked(extractNativeVideoGps).mockResolvedValue(data);

    await gps.extract();

    expect(extractNativeVideoGps).toHaveBeenCalledWith("/videos/clip.mp4");
    expect(saveNativeVideoGps).not.toHaveBeenCalled();
    expect(media.acceptTrack).toHaveBeenCalledWith(
      { track: data.track, name: "clip" },
      480,
    );
    expect(messages.notice.value).toContain("加入工程");
    expect(messages.notice.value).toContain("UTC+08:00");
    expect(messages.warning.value).toBe("");
    expect(gps.canExport.value).toBe(true);
    expect(gps.busy.value).toBe(false);
  });

  it("keeps the file clock when video and GPS times already agree", async () => {
    const { media, messages, gps } = setup();
    vi.mocked(extractNativeVideoGps).mockResolvedValue(
      exported(true, videoStart + 1200),
    );

    await gps.extract();

    expect(media.acceptTrack).toHaveBeenCalledWith(
      expect.objectContaining({ name: "clip" }),
      null,
    );
    expect(messages.notice.value).not.toContain("校正");
  });

  it("does not extract without a video path and warns for unverified models", async () => {
    const missing = setup({ path: "" });
    await missing.gps.extract();
    expect(extractNativeVideoGps).not.toHaveBeenCalled();
    expect(missing.gps.busy.value).toBe(false);

    const unverified = setup();
    vi.mocked(extractNativeVideoGps).mockResolvedValue(exported(false));
    await unverified.gps.extract();
    expect(unverified.messages.warning.value).toContain("Action 4/5/6");
    expect(unverified.media.acceptTrack).toHaveBeenCalled();
  });

  it("reports extraction failures without offering an export", async () => {
    const { messages, gps } = setup();
    const error = new Error("该视频没有 DJI GPS 元数据");
    vi.mocked(extractNativeVideoGps).mockRejectedValue(error);

    await gps.extract();

    expect(messages.report).toHaveBeenCalledWith(error);
    expect(messages.notice.value).toBe("");
    expect(gps.canExport.value).toBe(false);
    expect(gps.extracting.value).toBe(false);
  });
});

describe("optional GPX export", () => {
  it("saves the already extracted GPX to the chosen path", async () => {
    const { media, messages, gps } = setup();
    vi.mocked(extractNativeVideoGps).mockResolvedValue(exported());
    vi.mocked(saveNativeVideoGps).mockResolvedValue("/videos/clip.gpx");
    await gps.extract();

    await gps.exportGpx();

    expect(saveNativeVideoGps).toHaveBeenCalledWith(
      "/videos/clip.mp4",
      "<gpx>extracted</gpx>",
    );
    expect(messages.notice.value).toBe("GPX 已导出：/videos/clip.gpx");
    expect(media.acceptTrack).toHaveBeenCalledTimes(1);
    expect(gps.exporting.value).toBe(false);
  });

  it("does nothing when the save dialog is cancelled", async () => {
    const { messages, gps } = setup();
    vi.mocked(extractNativeVideoGps).mockResolvedValue(exported());
    vi.mocked(saveNativeVideoGps).mockResolvedValue(null);
    await gps.extract();
    messages.notice.value = "";

    await gps.exportGpx();

    expect(messages.notice.value).toBe("");
    expect(gps.canExport.value).toBe(true);
  });

  it("hides the cached export after switching videos and reports save failures", async () => {
    const { media, messages, gps } = setup();
    vi.mocked(extractNativeVideoGps).mockResolvedValue(exported());
    await gps.extract();
    expect(gps.canExport.value).toBe(true);

    media.asset.value = asset("/videos/other.mp4");
    expect(gps.canExport.value).toBe(false);
    await gps.exportGpx();
    expect(saveNativeVideoGps).not.toHaveBeenCalled();

    media.asset.value = asset();
    const error = new Error("无法保存 GPX：磁盘已满");
    vi.mocked(saveNativeVideoGps).mockRejectedValue(error);
    await gps.exportGpx();
    expect(messages.report).toHaveBeenCalledWith(error);
    expect(gps.exporting.value).toBe(false);
  });
});
