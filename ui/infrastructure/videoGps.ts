import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { native } from "./media";

export interface VideoGpsExport {
  gpxPath: string;
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

export async function exportNativeVideoGps(
  videoPath: string,
): Promise<VideoGpsExport | null> {
  if (!native) throw new Error("视频 GPS 提取请在桌面应用中使用。");
  const selected = await save({
    defaultPath: siblingGpxPath(videoPath),
    filters: [{ name: "GPX 轨迹", extensions: ["gpx"] }],
  });
  if (!selected) return null;
  const outputPath = /\.gpx$/i.test(selected) ? selected : `${selected}.gpx`;
  return invoke<VideoGpsExport>("extract_video_gps", {
    videoPath,
    outputPath,
  });
}
