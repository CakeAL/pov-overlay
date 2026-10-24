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
  const { track, activeVideo: asset, image, backgroundMode } = media;
  const video = ref<HTMLVideoElement>();
  const currentTime = ref(0),
    videoDuration = ref(0),
    playing = ref(false),
    muted = ref(true);
  const ratio = ref(16 / 9),
    sourceSize = ref({ width: 0, height: 0 });
  let animation = 0,
    lastClock = performance.now();
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
    if (asset.value) asset.value.duration = videoDuration.value;
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
  function tick(now: number) {
    if (playing.value) {
      if (asset.value && video.value)
        currentTime.value = video.value.currentTime;
      else {
        currentTime.value = Math.min(
          duration.value,
          currentTime.value + Math.max(0, (now - lastClock) / 1000),
        );
        if (currentTime.value >= duration.value) playing.value = false;
      }
    }
    lastClock = now;
    animation = requestAnimationFrame(tick);
  }
  async function togglePlay() {
    if (!duration.value) return;
    if (!asset.value) {
      if (currentTime.value >= duration.value) seek(0);
      lastClock = performance.now();
      playing.value = !playing.value;
      return;
    }
    if (!video.value) return;
    if (video.value.paused) {
      if (video.value.ended) seek(0);
      try {
        await video.value.play();
      } catch {
        messages.error.value = "视频无法播放，请检查编码。";
      }
    } else video.value.pause();
  }
  function seek(time: number) {
    currentTime.value = Math.max(0, Math.min(duration.value, time));
    if (video.value) video.value.currentTime = currentTime.value;
  }

  watch([asset, image, backgroundMode], async ([value]) => {
    video.value?.pause();
    currentTime.value = 0;
    playing.value = false;
    videoDuration.value = value?.duration ?? media.asset.value?.duration ?? 0;
    const picture = backgroundMode.value === "image" ? image.value : null;
    ratio.value = picture ? picture.width / picture.height : 16 / 9;
    sourceSize.value = picture
      ? { width: picture.width, height: picture.height }
      : { width: 0, height: 0 };
    await nextTick();
    video.value?.load();
  });
  watch(track, () => {
    if (!asset.value) {
      currentTime.value = 0;
      playing.value = false;
    }
  });
  watch(muted, (value) => {
    if (video.value) video.value.muted = value;
  });
  onMounted(() => {
    lastClock = performance.now();
    animation = requestAnimationFrame(tick);
  });
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
