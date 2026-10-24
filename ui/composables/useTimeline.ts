import { computed } from "vue";
import { sampleAt, formatTime } from "../domain/telemetry";
import type { MediaSession } from "./useMediaSession";
import type { Playback } from "./usePlayback";
import type { Alignment } from "./useAlignment";

export function useTimeline(
  media: MediaSession,
  playback: Playback,
  alignment: Alignment,
) {
  const { track, activeVideo:asset } = media;
  const { currentTime, duration } = playback;
  const { offset, alignmentKnown } = alignment;
  const absoluteTime = computed(() =>
    track.value
      ? track.value.startMs + (offset.value + currentTime.value) * 1000
      : null,
  );
  const sample = computed(() =>
    track.value &&
    (!asset.value || alignmentKnown.value) &&
    absoluteTime.value !== null
      ? sampleAt(track.value, absoluteTime.value)
      : null,
  );
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
  const routePath = computed(() => {
    if (!track.value) return "";
    const points = track.value.samples.filter(
      (_, index) =>
        index % Math.max(1, Math.floor(track.value!.samples.length / 120)) ===
        0,
    );
    const lats = points.map((point) => point.latitude),
      lons = points.map((point) => point.longitude);
    const minLat = Math.min(...lats),
      maxLat = Math.max(...lats),
      minLon = Math.min(...lons),
      maxLon = Math.max(...lons);
    return points
      .map(
        (point, index) =>
          `${index ? "L" : "M"}${8 + ((point.longitude - minLon) / (maxLon - minLon || 1)) * 104},${44 - ((point.latitude - minLat) / (maxLat - minLat || 1)) * 36}`,
      )
      .join(" ");
  });

  return { absoluteTime, sample, status, coverage, timelineTicks, routePath };
}
