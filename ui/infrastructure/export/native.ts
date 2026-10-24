import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { ExportSettings } from "../../domain/exportSettings";
export interface EncoderInfo { path: string; prores4444: boolean; pngMov: boolean }
export const encoderInfo = () => invoke<EncoderInfo>("export_encoder_info");
export async function chooseExportPath(name: string): Promise<string | null> {
  return save({ defaultPath: `${name.replace(/[\\/:*?"<>|]/g, "_") || "overlay"}.mov`, filters: [{ name: "MOV 视频", extensions: ["mov"] }] });
}
export const startExport = (path: string, settings: ExportSettings, protectedVideo?: string) =>
  invoke<string>("start_overlay_export", { path, settings, protectedVideo });
export const appendFrame = (id: string, index: number, bytes: Uint8Array) =>
  invoke<void>("append_overlay_frame", bytes, { headers: { "x-export-id": id, "x-frame-index": String(index) } });
export const finishExport = (id: string) => invoke<void>("finish_overlay_export", { id });
export const cancelExport = (id: string) => invoke<void>("cancel_overlay_export", { id });
