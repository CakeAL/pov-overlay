import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { Track } from "../domain/types";
import { native } from "./media";

export interface VideoGpsExtraction {
  track: Track;
  gpx: string;
  pointCount: number;
  rawPointCount: number;
  cameraName: string;
  protoName: string;
  skippedSamples: number;
  supportedModel: boolean;
}

function siblingGpxPath(videoPath: string) {
  return `${videoPath.replace(/\.[^./\\]+$/, "")}.gpx`;
}

export function extractNativeVideoGps(videoPath: string) {
  if (!native) throw new Error("从视频提取 GPS 请在桌面应用中使用。");
  return invoke<VideoGpsExtraction>("extract_video_gps", { videoPath });
}

export async function saveNativeVideoGps(
  videoPath: string,
  gpx: string,
): Promise<string | null> {
  if (!native) throw new Error("GPX 导出请在桌面应用中使用。");
  const selected = await save({
    defaultPath: siblingGpxPath(videoPath),
    filters: [{ name: "GPX 轨迹", extensions: ["gpx"] }],
  });
  if (!selected) return null;
  const path = /\.gpx$/i.test(selected) ? selected : `${selected}.gpx`;
  await invoke("write_gpx", { path, content: gpx });
  return path;
}
