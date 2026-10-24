import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { Widget } from "../domain/types";
import { validateExport, type ExportFormat, type ExportBackground, type ExportSettings } from "../domain/exportSettings";
import { playbackSample } from "../domain/playbackSample";
import { ExportRenderer } from "../infrastructure/export/renderer";
import { encoderInfo, chooseExportPath, startExport, appendFrame, finishExport, cancelExport, type EncoderInfo } from "../infrastructure/export/native";
import { native } from "../infrastructure/media";
import type { Timeline } from "./useTimeline";
import type { WidgetLayout } from "./useWidgetLayout";
import type { Playback } from "./usePlayback";
import type { Alignment } from "./useAlignment";
import type { MediaSession } from "./useMediaSession";
import type { TelemetrySettings } from "./useTelemetrySettings";
import type { Documents } from "./useDocuments";
import type { EditorMessages } from "./useMessages";

export function useVideoExport(timeline: Timeline, layout: WidgetLayout, playback: Playback, alignment: Alignment,
  media: MediaSession, telemetry: TelemetrySettings, documents: Documents, messages: EditorMessages) {
  const open = ref(false), checking = ref(false), busy = ref(false);
  const info = ref<EncoderInfo | null>(null), error = ref("");
  const width = ref(1920), height = ref(1080), fps = ref(30), format = ref<ExportFormat>("prores4444");
  const background = ref<ExportBackground>("transparent");
  const preferHardware = ref(true), encoderLabel = ref("");
  watch(background, value => {
    format.value = value === "green" ? "h264Mp4" : info.value?.prores4444 ? "prores4444" : "pngMov";
  });
  const start = ref(0), end = ref(0), progress = ref(0), phase = ref("");
  let job: string | null = null, cancelled = false;
  let controller: AbortController | null = null;
  const ready = computed(() => !!timeline.preparedTrack.value && playback.duration.value > 0
    && (!media.activeVideo.value || alignment.alignmentKnown.value));
  const mismatch = computed(() => Math.abs(width.value / height.value - playback.ratio.value) > 0.001);
  async function checkEncoder() {
    checking.value = true; error.value = ""; info.value = null;
    try {
      if (!native) throw new Error("视频导出请在桌面应用中使用。");
      info.value = await encoderInfo();
      if (!info.value.prores4444 && info.value.pngMov) format.value = "pngMov";
      if (background.value === "green") format.value = "h264Mp4";
      if (!info.value.prores4444 && !info.value.pngMov && !info.value.h264Mp4) throw new Error("当前 FFmpeg 缺少可用的视频编码器。");
    } catch (reason) { error.value = String(reason instanceof Error ? reason.message : reason); }
    finally { checking.value = false; }
  }
  async function show() {
    if (busy.value) { open.value = true; return; }
    open.value = true;
    start.value = 0; end.value = playback.duration.value;
    progress.value = 0; phase.value = ""; encoderLabel.value = "";
    await checkEncoder();
  }
  function resolution(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (value) [width.value, height.value] = value.split("x").map(Number) as [number, number];
  }
  async function cancel() {
    cancelled = true; controller?.abort(); phase.value = "正在取消";
    if (job) { try { await cancelExport(job); } catch { /* the finishing task may have already completed */ } }
  }
  async function run() {
    if (busy.value || !ready.value || !info.value) return;
    const track = timeline.preparedTrack.value!;
    const settings: ExportSettings = { width: Number(width.value), height: Number(height.value), fps: Number(fps.value),
      durationSeconds: Number(end.value) - Number(start.value), format: format.value, background: background.value, preferHardware: preferHardware.value };
    let renderer: ExportRenderer | null = null;
    error.value = "";
    try {
      const frames = validateExport(settings);
      if (!Number.isFinite(start.value) || start.value < 0 || end.value > playback.duration.value)
        throw new Error("导出区间超出当前时间轴。");
      if (!info.value[format.value]) throw new Error("当前 FFmpeg 不支持所选编码器。");
      busy.value = true; cancelled = false; controller = new AbortController(); phase.value = "准备导出";
      const path = await chooseExportPath(documents.name.value, settings.format);
      if (!path || cancelled) { phase.value = ""; return; }
      playback.playing.value = false; playback.video.value?.pause();
      const widgets: Widget[] = JSON.parse(JSON.stringify(layout.widgets.value));
      if (!widgets.some(widget => widget.visible)) throw new Error("请先显示至少一个画布元素。");
      const offset = alignment.offset.value, refresh = telemetry.refreshSeconds.value, origin = Number(start.value);
      renderer = new ExportRenderer(settings.width, settings.height, playback.ratio.value, widgets, settings.background, track, offset);
      await document.fonts.ready;
      settings.frame = renderer.region;
      const started = await startExport(path, settings, media.asset.value?.path);
      job = started.id;
      encoderLabel.value = started.hardware ? "硬件编码" : "软件编码";
      phase.value = "正在渲染"; progress.value = 0;
      let pending: { index: number; count: number; bytes: Uint8Array } | null = null;
      const flush = async () => {
        if (!pending || cancelled) return;
        await appendFrame(job!, pending.index, pending.bytes, pending.count);
        pending = null;
      };
      for (let index = 0; index < frames; index++) {
        if (cancelled) throw new Error("导出已取消。");
        const elapsed = origin + index / settings.fps;
        const bytes = await renderer.frame(playbackSample(track, elapsed, offset, refresh), elapsed, controller.signal);
        if (cancelled) throw new Error("导出已取消。");
        if (pending && (pending.bytes !== bytes || pending.count >= 120)) await flush();
        if (pending) pending.count++;
        else pending = { index, count: 1, bytes };
        progress.value = (index + 1) / frames;
        if (pending.count >= 120) await flush();
      }
      await flush();
      if (cancelled) throw new Error("导出已取消。");
      phase.value = "正在封装";
      await finishExport(job);
      job = null;
      phase.value = "导出完成";
      messages.notice.value = `视频已导出：${path}`;
    } catch (reason) {
      if (job) { try { await cancelExport(job); } catch { /* already removed */ } }
      if (cancelled) phase.value = "导出已取消";
      else { error.value = reason instanceof Error ? reason.message : String(reason); phase.value = "导出失败"; }
    } finally {
      job = null; renderer?.dispose(); controller = null; busy.value = false;
    }
  }
  onBeforeUnmount(() => { if (job) void cancel(); });
  return { open, checking, busy, info, error, width, height, fps, format, background, preferHardware, encoderLabel, start, end, progress, phase,
    ready, mismatch, show, checkEncoder, resolution, cancel, run };
}
