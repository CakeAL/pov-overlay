import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { exportExtension, type ExportSettings, type ExportFormat } from "../../domain/exportSettings";
export interface EncoderInfo { path: string; prores4444: boolean; pngMov: boolean; h264Mp4: boolean; webmVp9: boolean }
export const encoderInfo = () => invoke<EncoderInfo>("export_encoder_info");
export async function chooseExportPath(name: string, format: ExportFormat): Promise<string | null> {
  const extension = exportExtension(format);
  return save({ defaultPath: `${name.replace(/[\\/:*?"<>|]/g, "_") || "overlay"}.${extension}`, filters: [{ name: `${extension.toUpperCase()} 视频`, extensions: [extension] }] });
}
export interface StartedExport { id: string; encoder: string; hardware: boolean }
export const startExport = (path: string, settings: ExportSettings, protectedVideo?: string) =>
  invoke<StartedExport>("start_overlay_export", { path, settings, protectedVideo });
export const appendFrame = (id: string, index: number, bytes: Uint8Array, count = 1) =>
  invoke<void>("append_overlay_frame", bytes, { headers: { "x-export-id": id, "x-frame-index": String(index), "x-frame-count": String(count) } });
export const finishExport = (id: string) => invoke<void>("finish_overlay_export", { id });
export const cancelExport = (id: string) => invoke<void>("cancel_overlay_export", { id });
