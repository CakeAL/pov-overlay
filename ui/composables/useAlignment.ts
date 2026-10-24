import { computed, ref, watch, type Ref } from "vue";
import { alignmentOffset } from "../domain/telemetry";
import type { Track, VideoAsset } from "../domain/types";
import type { EditorMessages } from "./useMessages";

export function useAlignment(
  track: Ref<Track | null>,
  asset: Ref<VideoAsset | null>,
  messages: EditorMessages,
) {
  const offset = ref(0),
    alignmentKnown = ref(false);
  const syncMode = ref<"auto" | "manual" | "none">("none");
  const manualStart = ref(""),
    showTiming = ref(false);
  const offsetLabel = computed(
    () => `${offset.value >= 0 ? "+" : ""}${offset.value.toFixed(2)} s`,
  );
  function localInput(timestamp: number) {
    const date = new Date(timestamp);
    return new Date(timestamp - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 23);
  }
  function autoAlign() {
    if (!track.value || asset.value?.capturedAtMs == null) return;
    offset.value = alignmentOffset(track.value, asset.value.capturedAtMs);
    alignmentKnown.value = true;
    syncMode.value = "auto";
    manualStart.value = localInput(asset.value.capturedAtMs);
  }
  function setManualOffset(event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    offset.value = value;
    alignmentKnown.value = true;
    syncMode.value = "manual";
  }
  function applyManualTime() {
    const timestamp = Date.parse(manualStart.value);
    if (!track.value || !Number.isFinite(timestamp)) {
      messages.error.value = "请先导入 GPX，并填写有效的视频起始时间。";
      return;
    }
    offset.value = alignmentOffset(track.value, timestamp);
    alignmentKnown.value = true;
    syncMode.value = "manual";
    messages.error.value = "";
  }

  watch(
    [track, asset],
    ([nextTrack,nextAsset], [previousTrack,previousAsset]) => {
      if(nextAsset===previousAsset&&nextAsset&&previousTrack&&nextTrack&&syncMode.value==='manual'&&alignmentKnown.value){offset.value=(previousTrack.startMs+offset.value*1000-nextTrack.startMs)/1000;return;}
      offset.value = 0;
      alignmentKnown.value = false;
      syncMode.value = "none";
      manualStart.value =
        asset.value?.capturedAtMs == null
          ? ""
          : localInput(asset.value.capturedAtMs);
      autoAlign();
      if (asset.value && asset.value.capturedAtMs === null)
        showTiming.value = true;
    },
    { flush: "sync" },
  );
  return {
    offset,
    alignmentKnown,
    syncMode,
    manualStart,
    showTiming,
    offsetLabel,
    autoAlign,
    setManualOffset,
    applyManualTime,
  };
}
export type Alignment = ReturnType<typeof useAlignment>;
