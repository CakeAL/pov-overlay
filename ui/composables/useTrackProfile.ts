import { computed, ref, watch } from "vue";
import { buildTrackProfile, profileSpeed, profileY } from "../domain/trackProfile";
import { sampleAt } from "../domain/telemetry";
import type { Timeline } from "./useTimeline";
import type { Playback } from "./usePlayback";
import type { Alignment } from "./useAlignment";
import type { MediaSession } from "./useMediaSession";

export function useTrackProfile(
  timeline: Timeline,
  playback: Playback,
  alignment: Alignment,
  media: MediaSession,
) {
  const hoverFraction = ref<number | null>(null);
  const geometry = computed(() =>
    timeline.preparedTrack.value && (!media.activeVideo.value || alignment.alignmentKnown.value)
      ? buildTrackProfile(timeline.preparedTrack.value, playback.duration.value, alignment.offset.value)
      : null,
  );
  watch(geometry, () => { hoverFraction.value = null; });
  const cursorFraction = computed(() => playback.duration.value > 0
    ? Math.max(0, Math.min(1, playback.currentTime.value / playback.duration.value))
    : 0);
  const hover = computed(() => {
    const graph = geometry.value, fraction = hoverFraction.value;
    if (!graph || fraction == null || !timeline.preparedTrack.value) return null;
    const timestampMs = graph.startMs + fraction * (graph.endMs - graph.startMs);
    const sample = sampleAt(timeline.preparedTrack.value, timestampMs);
    const speed = sample ? profileSpeed(sample, timeline.preparedTrack.value) : null;
    return {
      fraction, timestampMs, sample, speed,
      elapsedSeconds: fraction * playback.duration.value,
      speedY: speed == null ? null : profileY(speed, graph.speedScale),
      elevationY: sample?.elevation == null || !graph.elevationScale
        ? null : profileY(sample.elevation, graph.elevationScale),
    };
  });
  function pointAt(event: PointerEvent | MouseEvent) {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (bounds.width <= 0) return;
    hoverFraction.value = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  }
  function seek(event: MouseEvent) {
    pointAt(event);
    if (hoverFraction.value != null) playback.seek(hoverFraction.value * playback.duration.value);
  }
  function keydown(event: KeyboardEvent) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.key === "Home" ? 0
      : event.key === "End" ? playback.duration.value
      : playback.currentTime.value + (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 10 : 1);
    playback.seek(target);
    hoverFraction.value = cursorFraction.value;
  }
  return { geometry, hover, cursorFraction, hoverFraction, pointAt, seek, keydown };
}
