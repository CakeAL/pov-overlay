import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import type { MediaSession } from "./useMediaSession";
import type { EditorMessages } from "./useMessages";

export function usePlayback(media: MediaSession, messages: EditorMessages) {
  const { track, asset } = media;
  const video = ref<HTMLVideoElement>();
  const currentTime = ref(0),
    videoDuration = ref(0),
    playing = ref(false),
    muted = ref(true);
  const ratio = ref(16 / 9),
    sourceSize = ref({ width: 0, height: 0 });
  let animation = 0;
  const duration = computed(() =>
    asset.value
      ? videoDuration.value
      : track.value
        ? (track.value.endMs - track.value.startMs) / 1000
        : 0,
  );
  function loadedMetadata() {
    const element = video.value;
    if (!element) return;
    videoDuration.value = Number.isFinite(element.duration)
      ? element.duration
      : 0;
    if (element.videoWidth && element.videoHeight) {
      ratio.value = element.videoWidth / element.videoHeight;
      sourceSize.value = {
        width: element.videoWidth,
        height: element.videoHeight,
      };
    }
  }
  function videoError() {
    messages.error.value =
      "当前系统无法解码这个视频。请使用 H.264 MP4 预览，或转换一份预览副本；GPX 和画布布局可以继续编辑。";
    playing.value = false;
  }
  function tick() {
    if (video.value && !video.value.paused)
      currentTime.value = video.value.currentTime;
    animation = requestAnimationFrame(tick);
  }
  async function togglePlay() {
    if (!video.value || !asset.value) return;
    if (video.value.paused) {
      if (video.value.ended) seek(0);
      try {
        await video.value.play();
      } catch {
        messages.error.value = "视频无法播放，请确认视频编码受当前系统支持。";
      }
    } else video.value.pause();
  }
  function seek(time: number) {
    currentTime.value = Math.max(0, Math.min(duration.value, time));
    if (video.value) video.value.currentTime = currentTime.value;
  }

  watch(asset, async (value) => {
    video.value?.pause();
    currentTime.value = 0;
    playing.value = false;
    videoDuration.value = value?.duration ?? 0;
    ratio.value = 16 / 9;
    sourceSize.value = { width: 0, height: 0 };
    await nextTick();
    video.value?.load();
  });
  watch(track, () => {
    if (!asset.value) currentTime.value = 0;
  });
  watch(muted, (value) => {
    if (video.value) video.value.muted = value;
  });
  onMounted(tick);
  onBeforeUnmount(() => cancelAnimationFrame(animation));
  return {
    video,
    currentTime,
    videoDuration,
    playing,
    muted,
    ratio,
    sourceSize,
    duration,
    loadedMetadata,
    videoError,
    togglePlay,
    seek,
  };
}
export type Playback = ReturnType<typeof usePlayback>;
