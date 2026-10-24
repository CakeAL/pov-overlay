import type { FrameRegion } from "./exportRegion";
export type ExportFormat = "prores4444" | "pngMov" | "h264Mp4";
export type ExportBackground = "transparent" | "green";
export const exportExtension = (format: ExportFormat) => format === "h264Mp4" ? "mp4" : "mov";
export interface ExportSettings {
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  format: ExportFormat;
  background: ExportBackground;
  preferHardware?: boolean;
  frame?: FrameRegion;
}
export function validateExport(settings: ExportSettings): number {
  const { width, height, fps, durationSeconds } = settings;
  if (![width, height].every(v => Number.isInteger(v) && v >= 64 && v <= 7680 && v % 2 === 0)
    || width * height > 33_177_600)
    throw new Error("分辨率须为 64–7680 之间的偶数，且不超过 8K 像素总量。");
  if (!Number.isFinite(fps) || fps < 1 || fps > 120) throw new Error("帧率须为 1–120 fps。");
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 86400)
    throw new Error("导出时长须大于 0 且不超过 24 小时。");
  if (settings.format === "h264Mp4" && settings.background !== "green")
    throw new Error("H.264 MP4 不保留透明通道，请选择绿幕或 MOV 格式。");
  return Math.ceil(durationSeconds * fps);
}
