import {routePreview,coverageIntervals} from "../domain/routePreview";
import {prepareMotion} from "../domain/motion";
import type {TelemetrySettings} from "./useTelemetrySettings";
import { computed } from "vue";
import { sampleAt, formatTime } from "../domain/telemetry";
import type { MediaSession } from "./useMediaSession";
import type { Playback } from "./usePlayback";
import type { Alignment } from "./useAlignment";

export function useTimeline(
  media: MediaSession,
  playback: Playback,
  alignment: Alignment,
  settings:TelemetrySettings,
) {
  const { track, activeVideo:asset } = media;
  const { currentTime, duration } = playback;
  const { offset, alignmentKnown } = alignment;
  const absoluteTime = computed(() =>
    track.value
      ? track.value.startMs + (offset.value + currentTime.value) * 1000
      : null,
  );
  const preparedTrack = computed(()=>track.value?prepareMotion(track.value,Math.max(0,Math.min(60,Number(settings.smoothingSeconds.value)||0))):null);
  const sample = computed(()=>{
    if(!preparedTrack.value || (asset.value&&!alignmentKnown.value))return null;
    const interval=Math.max(0.01,Math.min(10,Number(settings.refreshSeconds.value)||0.1));
    const t=Math.floor((currentTime.value+1e-8)/interval)*interval;
    return sampleAt(preparedTrack.value,preparedTrack.value.startMs+(offset.value+t)*1000);
  });
  const currentHeading = computed(()=>sample.value?.headingDeg??null);
  const status = computed(() =>
    !track.value
      ? "等待 GPX 轨迹"
      : asset.value && !alignmentKnown.value
        ? "待设置视频时间"
        : !sample.value
          ? "当前时间无 GPX 数据"
          : "轨迹已连接",
  );
  const coverage = computed(() => {
    if (
      !track.value ||
      !duration.value ||
      (asset.value && !alignmentKnown.value)
    )
      return null;
    const left = Math.max(0, -offset.value),
      right = Math.min(
        duration.value,
        (track.value.endMs - track.value.startMs) / 1000 - offset.value,
      );
    return right > left
      ? {
          left: `${(left / duration.value) * 100}%`,
          width: `${((right - left) / duration.value) * 100}%`,
        }
      : null;
  });
  const timelineTicks = computed(() =>
    Array.from({ length: 7 }, (_, index) =>
      formatTime((duration.value * index) / 6),
    ),
  );
  const routeGeometry=computed(()=>track.value?routePreview(track.value):null);
  const routePath=computed(()=>routeGeometry.value?.path??'');
  const routePoint=computed(()=>sample.value&&routeGeometry.value?routeGeometry.value.point(sample.value):null);
  const coverageRanges=computed(()=>{
    if(!track.value||!duration.value||(asset.value&&!alignmentKnown.value))return [];
    return coverageIntervals(track.value).flatMap(([start,end])=>{const left=Math.max(0,(start-track.value!.startMs)/1000-offset.value),right=Math.min(duration.value,(end-track.value!.startMs)/1000-offset.value);return right>left?[{left:`${left/duration.value*100}%`,width:`${(right-left)/duration.value*100}%`}]:[];});
  });

  return { absoluteTime, sample, currentHeading, status, coverage,coverageRanges, timelineTicks, routePath,routePoint };
}
