import type {
  Widget,
  Track,
  ImageAsset,
  TrackSource,
  VideoAsset,
} from "../../domain/types";
import {
  DEFAULT_SMOOTHING_POINTS,
  MAX_SMOOTHING_POINTS,
} from "../../domain/speedEstimation";
import { sanitizeSvg } from "../svg";
import { correctTrackTime, validTrackTimeOffset } from "../../domain/trackTime";
export interface PresetDocument {
  type: "pov-overlay/preset";
  version: 1;
  name: string;
  widgets: Widget[];
  smoothingPoints: number;
  refreshSeconds: number;
  stopThresholdKmh: number;
  aspectRatio: number;
}
export interface ProjectDocument extends Omit<PresetDocument, "type"> {
  type: "pov-overlay/project";
  tracks: TrackSource[];
  joinSources: boolean;
  backgroundMode: "none" | "image" | "video";
  image: ImageAsset | null;
  video: Omit<VideoAsset, "url" | "warning"> | null;
  currentTime: number;
  offset: number;
  alignmentKnown: boolean;
  syncMode: "auto" | "manual" | "none";
}
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("文件结构无效。");
  return v as Record<string, unknown>;
};
const text = (v: unknown, max = 256): string => {
  if (typeof v !== "string" || v.length > max)
    throw new Error("文本字段无效。");
  return v;
};
const num = (v: unknown, min: number, max: number): number => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
    throw new Error("数值字段超出范围。");
  return v;
};
const bool = (v: unknown): boolean => {
  if (typeof v !== "boolean") throw new Error("布尔字段无效。");
  return v;
};
export function validateWidgets(v: unknown): Widget[] {
  if (!Array.isArray(v) || v.length > 100) throw new Error("元素列表无效。");
  const ids = new Set<string>();
  return v.map((value) => {
    const w = object(value),
      id = text(w.id);
    if (ids.has(id)) throw new Error("元素 ID 重复。");
    ids.add(id);
    if (!["speed", "coordinates", "svg"].includes(String(w.kind)))
      throw new Error("元素类型无效。");
    const color = text(w.color);
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("颜色无效。");
    return {
      id,
      label: text(w.label),
      kind: w.kind as Widget["kind"],
      x: num(w.x, 0, 1),
      y: num(w.y, 0, 1),
      scale: num(w.scale, 0.65, 1.65),
      opacity: num(w.opacity, 0, 100),
      color,
      visible: bool(w.visible),
      locked: bool(w.locked),
      speedMaxKmh: w.speedMaxKmh == null ? undefined : num(w.speedMaxKmh, 1, 2000),
      typography: w.typography == null ? undefined : (() => {
        const t = object(w.typography);
        const fontFamily = t.fontFamily == null ? undefined : text(t.fontFamily, 120);
        if (fontFamily && !/^[\w ,.-]{1,120}$/.test(fontFamily)) throw new Error("字体名称无效。");
        return { fontFamily, fontSize: t.fontSize == null ? undefined : num(t.fontSize, 8, 200), bold: t.bold == null ? undefined : bool(t.bold), italic: t.italic == null ? undefined : bool(t.italic) };
      })(),
      widthRatio: w.widthRatio == null ? undefined : num(w.widthRatio, 0.01, 1),
      svg:
        w.kind === "svg"
          ? sanitizeSvg(text(object(w.svg).source, 2 * 1024 * 1024))
          : undefined,
    };
  });
}
function validateTrack(value: unknown): Track {
  const t = object(value);
  if (
    !Array.isArray(t.samples) ||
    t.samples.length < 2 ||
    t.samples.length > 1_000_000
  )
    throw new Error("GPX 点列表无效。");
  let last = -Infinity;
  const samples = t.samples.map((value) => {
    const p = object(value),
      timestampMs = num(p.timestampMs, -8.64e15, 8.64e15);
    if (timestampMs <= last) throw new Error("GPX 时间必须递增。");
    last = timestampMs;
    return {
      timestampMs,
      latitude: num(p.latitude, -90, 90),
      longitude: num(p.longitude, -180, 180),
      elevation: p.elevation == null ? null : num(p.elevation, -1e7, 1e7),
      speedMps: num(p.speedMps, 0, 1e9),
      segment: num(p.segment, 0, 1e9),
    };
  });
  return {
    name: text(t.name),
    samples,
    startMs: samples[0]!.timestampMs,
    endMs: samples.at(-1)!.timestampMs,
    distanceMeters: num(t.distanceMeters, 0, 1e15),
    skippedPoints: num(t.skippedPoints, 0, 1e9),
  };
}
function readSmoothingPoints(d: Record<string, unknown>): number {
  if (d.smoothingPoints === undefined) {
    // Seconds cannot be mapped to point counts for irregular GPX sampling.
    // Preserve "off"; migrate enabled legacy windows to the new default.
    return num(d.smoothingSeconds, 0, 60) === 0 ? 0 : DEFAULT_SMOOTHING_POINTS;
  }
  const points = num(d.smoothingPoints, 0, MAX_SMOOTHING_POINTS);
  if (
    points !== 0 &&
    (!Number.isInteger(points) || points < 3 || points % 2 === 0)
  )
    throw new Error("速度平滑窗口必须为 0 或 3–61 之间的奇数。");
  return points;
}
export function parseDocument(json: string, kind: "preset"): PresetDocument;
export function parseDocument(json: string, kind: "project"): ProjectDocument;
export function parseDocument(
  json: string,
  kind: "preset" | "project",
): PresetDocument | ProjectDocument {
  if (json.length > 100 * 1024 * 1024) throw new Error("工程不能超过 100 MB。");
  const d = object(JSON.parse(json));
  if (d.version !== 1 || d.type !== `pov-overlay/${kind}`)
    throw new Error("文件类型或版本不匹配。");
  const base = {
    version: 1 as const,
    name: text(d.name),
    widgets: validateWidgets(d.widgets),
    smoothingPoints: readSmoothingPoints(d),
    refreshSeconds: num(d.refreshSeconds, 0.01, 10),
    stopThresholdKmh:
      d.stopThresholdKmh == null ? 0.5 : num(d.stopThresholdKmh, 0, 2000),
    aspectRatio: num(d.aspectRatio, 0.01, 100),
  };
  if (kind === "preset") return { ...base, type: "pov-overlay/preset" };
  if (!Array.isArray(d.tracks) || d.tracks.length > 100)
    throw new Error("轨迹列表无效。");
  const tracks = d.tracks.map((value) => {
    const s = object(value);
    const utcLabelOffsetMinutes =
      s.utcLabelOffsetMinutes == null ? null : s.utcLabelOffsetMinutes;
    if (
      utcLabelOffsetMinutes !== null &&
      !validTrackTimeOffset(utcLabelOffsetMinutes)
    )
      throw new Error("GPX 时区偏移无效。");
    const track = validateTrack(s.track);
    correctTrackTime(track, utcLabelOffsetMinutes);
    return {
      id: text(s.id),
      name: text(s.name),
      track,
      enabled: s.enabled == null ? true : bool(s.enabled),
      utcLabelOffsetMinutes,
    };
  });
  const ids = tracks.map((t) => t.id);
  if (new Set(ids).size !== ids.length) throw new Error("轨迹 ID 重复。");
  if (
    !["none", "image", "video"].includes(String(d.backgroundMode)) ||
    !["auto", "manual", "none"].includes(String(d.syncMode))
  )
    throw new Error("工程模式无效。");
  let image: ImageAsset | null = null,
    video: ProjectDocument["video"] = null;
  if (d.image) {
    const i = object(d.image),
      url = text(i.url, 30 * 1024 * 1024);
    if (
      !/^data:image\/(png|jpeg|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(url)
    )
      throw new Error("工程图片无效。");
    image = {
      name: text(i.name),
      url,
      width: num(i.width, 1, 100000),
      height: num(i.height, 1, 100000),
    };
  }
  if (d.video) {
    const v = object(d.video);
    video = {
      name: text(v.name),
      path: v.path == null ? undefined : text(v.path, 4096),
      duration: num(v.duration, 0, 1e9),
      capturedAtMs:
        v.capturedAtMs == null ? null : num(v.capturedAtMs, -8.64e15, 8.64e15),
      timeSource: v.timeSource == null ? null : text(v.timeSource),
    };
  }
  return {
    ...base,
    type: "pov-overlay/project",
    tracks,
    joinSources: d.joinSources == null ? true : bool(d.joinSources),
    image,
    video,
    backgroundMode: d.backgroundMode as ProjectDocument["backgroundMode"],
    currentTime: num(d.currentTime, 0, 1e9),
    offset: num(d.offset, -1e12, 1e12),
    alignmentKnown: bool(d.alignmentKnown),
    syncMode: d.syncMode as ProjectDocument["syncMode"],
  };
}
