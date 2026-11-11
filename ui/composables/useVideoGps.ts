import { ref } from "vue";
import { importNativeGpx } from "../infrastructure/media";
import { exportNativeVideoGps } from "../infrastructure/videoGps";
import {
  inferUtcLabelOffsetMinutes,
  utcOffsetLabel,
} from "../domain/trackTime";
import type { MediaSession } from "./useMediaSession";
import type { EditorMessages } from "./useMessages";

export function useVideoGps(
  media: MediaSession,
  messages: EditorMessages,
) {
  const busy = ref(false);

  async function exportGpx() {
    const video = media.asset.value;
    if (!video?.path || busy.value) return;
    busy.value = true;
    messages.clear();
    try {
      const exported = await exportNativeVideoGps(video.path);
      if (!exported) return;
      const imported = await importNativeGpx(exported.gpxPath);
      if (!imported) return;
      const correction =
        video.capturedAtMs == null
          ? null
          : inferUtcLabelOffsetMinutes(
              imported.track.startMs,
              video.capturedAtMs,
            );
      media.acceptTrack(imported, correction);
      messages.notice.value = `已提取 ${exported.pointCount.toLocaleString()} 个轨迹点并导出 GPX${
        correction == null
          ? ""
          : `，按 ${utcOffsetLabel(correction)} 校正`
      }。`;
      if (!exported.supportedModel)
        messages.warning.value = `该视频的 GPS 元数据版本 ${exported.protoName || "未知"} 不在已验证的 Action 4/5/6 列表中，请检查轨迹。`;
    } catch (reason) {
      messages.report(reason);
    } finally {
      busy.value = false;
    }
  }

  return { busy, exportGpx };
}
export type VideoGps = ReturnType<typeof useVideoGps>;
