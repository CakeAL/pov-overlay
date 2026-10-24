import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { parseGpx } from "./gpx";
import { readMp4CreationTime } from "./mp4";
import type { Track, VideoAsset } from "../domain/types";
export const native = isTauri();
export const VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "m4v",
  "webm",
  "mkv",
  "avi",
  "mts",
  "m2ts",
];
interface NativeVideo {
  name: string;
  path: string;
  capturedAtMs: number | null;
  timeSource: string | null;
  warning: string | null;
  duration: number;
}
export async function importNativeGpx(
  path?: string,
): Promise<{ track: Track; name: string } | null> {
  const selection =
    path ??
    (await open({
      multiple: false,
      filters: [{ name: "GPX 轨迹", extensions: ["gpx"] }],
    }));
  if (!selection || typeof selection !== "string") return null;
  return {
    track: await invoke<Track>("load_gpx", { path: selection }),
    name: selection.split(/[\\/]/).at(-1)!,
  };
}
export async function importNativeVideo(
  path?: string,
): Promise<VideoAsset | null> {
  const selection =
    path ??
    (await open({
      multiple: false,
      filters: [{ name: "预览视频", extensions: VIDEO_EXTENSIONS }],
    }));
  if (!selection || typeof selection !== "string") return null;
  const asset = await invoke<NativeVideo>("load_video", { path: selection });
  return { ...asset, url: convertFileSrc(asset.path) };
}
export async function importBrowserGpx(file: File) {
  if (file.size > 50 * 1024 * 1024)
    throw new Error("GPX 文件超过 50 MB，请先裁剪轨迹。");
  return { track: parseGpx(await file.text()), name: file.name };
}
export async function importBrowserVideo(file: File): Promise<VideoAsset> {
  let capturedAtMs: number | null = null;
  try {
    capturedAtMs = await readMp4CreationTime(file);
  } catch {
    /* Valid video may use a different container. */
  }
  return {
    name: file.name,
    url: URL.createObjectURL(file),
    capturedAtMs,
    timeSource: capturedAtMs === null ? null : "MP4 / MOV 容器时间（UTC）",
    warning:
      capturedAtMs === null
        ? "未找到带时区的拍摄时间，请手动设置视频起始时间。"
        : null,
    duration: 0,
  };
}
export function releaseVideo(asset: VideoAsset | null) {
  if (asset?.url.startsWith("blob:")) URL.revokeObjectURL(asset.url);
}

export async function importNativeGpxFiles(): Promise<
  Array<{ track: Track; name: string }>
> {
  const selection = await open({
    multiple: true,
    filters: [{ name: "GPX 轨迹", extensions: ["gpx"] }],
  });
  const results: Array<{ track: Track; name: string }> = [];
  for (const path of Array.isArray(selection)
    ? selection
    : typeof selection === "string"
      ? [selection]
      : []) {
    const value = await importNativeGpx(path);
    if (value) results.push(value);
  }
  return results;
}
