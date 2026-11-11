import { computed, ref } from "vue";
import {
  extractNativeVideoGps,
  saveNativeVideoGps,
} from "../infrastructure/videoGps";
import {
  inferUtcLabelOffsetMinutes,
  utcOffsetLabel,
} from "../domain/trackTime";
import type { MediaSession } from "./useMediaSession";
import type { EditorMessages } from "./useMessages";

interface ExtractedVideoGps {
  videoPath: string;
  gpx: string;
  pointCount: number;
}

export function useVideoGps(media: MediaSession, messages: EditorMessages) {
  const extracting = ref(false);
  const exporting = ref(false);
  const extracted = ref<ExtractedVideoGps | null>(null);
  const busy = computed(() => extracting.value || exporting.value);
  const canExport = computed(
    () =>
      extracted.value != null &&
      extracted.value.videoPath === media.asset.value?.path,
  );

  async function extract() {
    const video = media.asset.value;
    if (!video?.path || busy.value) return;
    extracting.value = true;
    messages.clear();
    try {
      const exported = await extractNativeVideoGps(video.path);
      extracted.value = {
        videoPath: video.path,
        gpx: exported.gpx,
        pointCount: exported.pointCount,
      };
      const correction =
        video.capturedAtMs == null
          ? null
          : inferUtcLabelOffsetMinutes(
              exported.track.startMs,
              video.capturedAtMs,
            );
      media.acceptTrack(
        { track: exported.track, name: exported.track.name || video.name },
        correction,
      );
      messages.notice.value = `已提取 ${exported.pointCount.toLocaleString()} 个轨迹点并加入工程${
        correction == null
          ? ""
          : `，按 ${utcOffsetLabel(correction)} 校正`
      }。`;
      if (!exported.supportedModel)
        messages.warning.value = `该视频的 GPS 元数据版本 ${exported.protoName || "未知"} 不在已验证的 Action 4/5/6 列表中，请检查轨迹。`;
    } catch (reason) {
      messages.report(reason);
    } finally {
      extracting.value = false;
    }
  }

  async function exportGpx() {
    const video = media.asset.value;
    const cached = extracted.value;
    if (
      !video?.path ||
      !cached ||
      cached.videoPath !== video.path ||
      busy.value
    )
      return;
    exporting.value = true;
    messages.clear();
    try {
      const path = await saveNativeVideoGps(video.path, cached.gpx);
      if (path) messages.notice.value = `GPX 已导出：${path}`;
    } catch (reason) {
      messages.report(reason);
    } finally {
      exporting.value = false;
    }
  }

  return { extracting, exporting, busy, canExport, extract, exportGpx };
}
export type VideoGps = ReturnType<typeof useVideoGps>;
