import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { parseGpx } from "./telemetry";
import type { Track, VideoAsset } from "./types";
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
/** Read only MP4/MOV box headers and the movie header, even for multi-GB video. */
export async function readMp4CreationTime(file: Blob): Promise<number | null> {
  const read = async (start: number, length: number) =>
    new DataView(
      await file
        .slice(start, Math.min(file.size, start + length))
        .arrayBuffer(),
    );
  const type = (view: DataView) =>
    String.fromCharCode(...[4, 5, 6, 7].map((index) => view.getUint8(index)));
  const find = async (
    start: number,
    end: number,
    target: string,
  ): Promise<{ offset: number; header: number; end: number } | null> => {
    for (
      let offset = start, count = 0;
      offset + 8 <= end && count < 10_000;
      count++
    ) {
      const view = await read(offset, 16);
      if (view.byteLength < 8) return null;
      const shortSize = view.getUint32(0);
      const header = shortSize === 1 ? 16 : 8;
      if (view.byteLength < header) return null;
      const size =
        shortSize === 1
          ? Number(view.getBigUint64(8))
          : shortSize === 0
            ? end - offset
            : shortSize;
      if (!Number.isSafeInteger(size) || size < header || offset + size > end)
        return null;
      if (type(view) === target) return { offset, header, end: offset + size };
      offset += size;
    }
    return null;
  };
  const movie = await find(0, file.size, "moov");
  if (!movie) return null;
  const header = await find(movie.offset + movie.header, movie.end, "mvhd");
  if (!header) return null;
  const data = await read(
    header.offset + header.header,
    Math.min(20, header.end - header.offset - header.header),
  );
  if (data.byteLength < 8) return null;
  const version = data.getUint8(0);
  if (version > 1 || (version === 1 && data.byteLength < 12)) return null;
  const seconds =
    version === 1 ? Number(data.getBigUint64(4)) : data.getUint32(4);
  const unixMs = (seconds - 2_082_844_800) * 1000;
  return seconds !== 0 && unixMs >= 0 && unixMs < 4_102_444_800_000
    ? unixMs
    : null;
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
