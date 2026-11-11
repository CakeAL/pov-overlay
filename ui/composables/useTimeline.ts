import { overlayContext } from "../domain/overlayContext";
import { routePreview, coverageIntervals } from "../domain/routePreview";
import { prepareMotion } from "../domain/motion";
import type { TelemetrySettings } from "./useTelemetrySettings";
import { computed } from "vue";
import { playbackSample, quantizeElapsed } from "../domain/playbackSample";
import { formatTime } from "../domain/telemetry";
import type { Sample } from "../domain/types";
import type { MediaSession } from "./useMediaSession";
import type { Playback } from "./usePlayback";
import type { Alignment } from "./useAlignment";

function sameSample(a: Sample | null, b: Sample | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.timestampMs === b.timestampMs &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.elevation === b.elevation &&
    a.speedMps === b.speedMps &&
    a.segment === b.segment &&
    a.headingDeg === b.headingDeg &&
    a.distanceMeters === b.distanceMeters &&
    a.speedSlope === b.speedSlope &&
    a.speedValid === b.speedValid
  );
}
export function useTimeline(
  media: MediaSession,
  playback: Playback,
  alignment: Alignment,
  settings: TelemetrySettings,
) {
  const { track, activeVideo: asset } = media;
  const { currentTime, duration } = playback;
  const { offset, alignmentKnown } = alignment;
  // Overlay data only changes on the configured refresh cadence; the player
  // and chart keep using raw currentTime for smooth motion.
  const sampleTime = computed(() =>
    quantizeElapsed(currentTime.value, settings.refreshSeconds.value),
  );
  const absoluteTime = computed(() =>
    track.value
      ? track.value.startMs + (offset.value + sampleTime.value) * 1000
      : null,
  );
  const preparedTrack = computed(() =>
    track.value
      ? prepareMotion(
          track.value,
          Number(settings.smoothingPoints.value),
          Math.max(
            0,
            Math.min(2000, Number(settings.stopThresholdKmh.value) || 0),
          ),
        )
      : null,
  );
  // Playback writes currentTime every animation frame. Keep returning the same
  // snapshot object until its values or the refresh bucket change, so widgets
  // and maps do not rebuild their SVG on every frame.
  let previousSample: Sample | null = null;
  const sample = computed(() => {
    if (!preparedTrack.value || (asset.value && !alignmentKnown.value))
      return null;
    const next = playbackSample(
      preparedTrack.value,
      currentTime.value,
      offset.value,
      settings.refreshSeconds.value,
    );
    if (sameSample(previousSample, next)) return previousSample;
    previousSample = next;
    return next;
  });
  const context = computed(() => overlayContext(preparedTrack.value, absoluteTime.value ?? 0, sample.value));
  const currentHeading = computed(() => sample.value?.headingDeg ?? null);
  const status = computed(() =>
    !track.value
      ? "等待 GPX 轨迹"
      : asset.value && !alignmentKnown.value
        ? "待设置视频时间"
        : !sample.value
          ? "当前时间无 GPX 数据"
          : sample.value.speedValid === false
            ? "当前时间无有效速度"
            : "轨迹已连接",
  );
  const timelineTicks = computed(() =>
    Array.from({ length: 7 }, (_, index) =>
      formatTime((duration.value * index) / 6),
    ),
  );
  const routeGeometry = computed(() =>
    track.value ? routePreview(track.value) : null,
  );
  const routePath = computed(() => routeGeometry.value?.path ?? "");
  const routePoint = computed(() =>
    sample.value && routeGeometry.value
      ? routeGeometry.value.point(sample.value)
      : null,
  );
  const coverageRanges = computed(() => {
    if (
      !track.value ||
      !duration.value ||
      (asset.value && !alignmentKnown.value)
    )
      return [];
    return coverageIntervals(track.value).flatMap(([start, end]) => {
      const left = Math.max(
          0,
          (start - track.value!.startMs) / 1000 - offset.value,
        ),
        right = Math.min(
          duration.value,
          (end - track.value!.startMs) / 1000 - offset.value,
        );
      return right > left
        ? [
            {
              left: `${(left / duration.value) * 100}%`,
              width: `${((right - left) / duration.value) * 100}%`,
            },
          ]
        : [];
    });
  });

  return {
    context,
    preparedTrack,
    sampleTime,
    absoluteTime,
    sample,
    currentHeading,
    status,
    coverageRanges,
    timelineTicks,
    routePath,
    routePoint,
  };
}

export type Timeline = ReturnType<typeof useTimeline>;
