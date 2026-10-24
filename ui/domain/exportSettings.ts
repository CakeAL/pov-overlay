export type ExportFormat = "prores4444" | "pngMov";
export interface ExportSettings {
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  format: ExportFormat;
}
export function validateExport(settings: ExportSettings): number {
  const { width, height, fps, durationSeconds } = settings;
  if (![width, height].every(v => Number.isInteger(v) && v >= 64 && v <= 7680 && v % 2 === 0)
    || width * height > 33_177_600)
    throw new Error("分辨率须为 64–7680 之间的偶数，且不超过 8K 像素总量。");
  if (!Number.isFinite(fps) || fps < 1 || fps > 120) throw new Error("帧率须为 1–120 fps。");
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 86400)
    throw new Error("导出时长须大于 0 且不超过 24 小时。");
  return Math.ceil(durationSeconds * fps);
}
