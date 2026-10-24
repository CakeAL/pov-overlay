import { ref, watch, nextTick } from "vue";
import type { MediaSession } from "./useMediaSession";
import type { WidgetLayout } from "./useWidgetLayout";
import type { Playback } from "./usePlayback";
import type { Alignment } from "./useAlignment";
import type { TelemetrySettings } from "./useTelemetrySettings";
import type { EditorMessages } from "./useMessages";
import {
  parseDocument,
  type PresetDocument,
  type ProjectDocument,
} from "../infrastructure/documents/schema";
import {
  readNativeDocument,
  saveDocument,
} from "../infrastructure/documents/files";
import {
  importNativeVideo,
  native,
  releaseVideo,
} from "../infrastructure/media";
import { imageSize } from "../infrastructure/images";
export function useDocuments(
  media: MediaSession,
  layout: WidgetLayout,
  playback: Playback,
  alignment: Alignment,
  telemetry: TelemetrySettings,
  messages: EditorMessages,
) {
  const name = ref("未命名工程"),
    busy = ref(false),
    projectInput = ref<HTMLInputElement>(),
    presetInput = ref<HTMLInputElement>();
  let pending: ProjectDocument | null = null;
  let unresolvedVideo: ProjectDocument["video"] = null;
  function preset(): PresetDocument {
    return {
      type: "pov-overlay/preset",
      version: 1,
      name: name.value,
      widgets: JSON.parse(JSON.stringify(layout.widgets.value)),
      smoothingSeconds: telemetry.smoothingSeconds.value,
      refreshSeconds: telemetry.refreshSeconds.value,
      aspectRatio: playback.ratio.value,
    };
  }
  function project(): ProjectDocument {
    const video = media.asset.value ?? unresolvedVideo;
    const deferred =
      pending && media.backgroundMode.value === "none" ? pending : null;
    return {
      ...preset(),
      type: "pov-overlay/project",
      tracks: media.sources.value,
      joinSources: media.joinSources.value,
      backgroundMode: deferred ? "video" : media.backgroundMode.value,
      image: media.image.value,
      video: video
        ? {
            name: video.name,
            path: video.path,
            capturedAtMs: video.capturedAtMs,
            timeSource: video.timeSource,
            duration: video.duration,
          }
        : null,
      currentTime: deferred?.currentTime ?? playback.currentTime.value,
      offset: deferred?.offset ?? alignment.offset.value,
      alignmentKnown:
        deferred?.alignmentKnown ?? alignment.alignmentKnown.value,
      syncMode: deferred?.syncMode ?? alignment.syncMode.value,
    };
  }
  async function action(work: () => Promise<void>) {
    if (busy.value) return;
    busy.value = true;
    messages.clear();
    try {
      await work();
    } catch (reason) {
      messages.report(reason);
    } finally {
      busy.value = false;
    }
  }
  function applyPreset(data: PresetDocument | ProjectDocument) {
    layout.remember();
    layout.widgets.value = data.widgets;
    layout.selectedId.value = data.widgets[0]?.id ?? "";
    telemetry.smoothingSeconds.value = data.smoothingSeconds;
    telemetry.refreshSeconds.value = data.refreshSeconds;
    playback.ratio.value = data.aspectRatio;
    layout.widgets.value.forEach(layout.clampWidget);
  }
  function restoreTime(data: ProjectDocument) {
    alignment.offset.value = data.offset;
    alignment.alignmentKnown.value = data.alignmentKnown;
    alignment.syncMode.value = data.syncMode;
    const element = playback.video.value;
    if (media.activeVideo.value && element && element.readyState < 1)
      element.addEventListener(
        "loadedmetadata",
        () => playback.seek(data.currentTime),
        { once: true },
      );
    else playback.seek(data.currentTime);
  }
  async function applyProject(data: ProjectDocument) {
    if (data.image) await imageSize(data.image.url);
    let restoredVideo = null;
    if (data.video?.path && native) {
      try {
        restoredVideo = await importNativeVideo(data.video.path);
      } catch {
        messages.notice.value = `视频需要重新关联：${data.video.name}`;
      }
    } else if (data.video)
      messages.notice.value = `视频需要重新关联：${data.video.name}`;
    pending = null;
    unresolvedVideo = restoredVideo ? null : data.video;
    playback.playing.value = false;
    playback.video.value?.pause();
    releaseVideo(media.asset.value);
    media.asset.value = null;
    media.joinSources.value = data.joinSources;
    media.restoreSources(data.tracks);
    media.image.value = data.image;
    if (restoredVideo) await media.acceptVideo(restoredVideo);
    media.backgroundMode.value =
      data.backgroundMode === "video" && !restoredVideo
        ? "none"
        : data.backgroundMode;
    await nextTick();
    applyPreset(data);
    name.value = data.name;
    if (data.video && !restoredVideo && data.backgroundMode === "video") {
      pending = data;
      alignment.offset.value = 0;
      alignment.alignmentKnown.value = false;
      alignment.syncMode.value = "none";
      playback.seek(data.currentTime + data.offset);
    } else restoreTime(data);
  }
  watch(
    media.asset,
    () => {
      if (media.asset.value) unresolvedVideo = null;
      if (pending && media.asset.value?.name === pending.video?.name) {
        const data = pending;
        pending = null;
        restoreTime(data);
      } else if (media.asset.value) pending = null;
    },
    { flush: "post" },
  );
  async function load(json: string, kind: "preset" | "project") {
    if (kind === "preset") applyPreset(parseDocument(json, "preset"));
    else await applyProject(parseDocument(json, "project"));
  }
  async function choose(kind: "preset" | "project") {
    if (!native) {
      (kind === "preset" ? presetInput : projectInput).value?.click();
      return;
    }
    await action(async () => {
      const json = await readNativeDocument();
      if (json !== null) await load(json, kind);
    });
  }
  async function selected(event: Event, kind: "preset" | "project") {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    try {
      if (file)
        await action(async () => {
          if (file.size > 100 * 1024 * 1024)
            throw new Error("工程不能超过 100 MB。");
          await load(await file.text(), kind);
        });
    } finally {
      input.value = "";
    }
  }
  async function saveCurrent(kind: "preset" | "project") {
    await action(async () => {
      const data = kind === "preset" ? preset() : project();
      if (kind === "preset") parseDocument(JSON.stringify(data), "preset");
      else parseDocument(JSON.stringify(data), "project");
      const safe = name.value.replace(/[\\/:*?"<>|]/g, "_") || "untitled";
      if (
        await saveDocument(
          `${safe}.${kind === "preset" ? "preset" : "pov"}.json`,
          JSON.stringify(data),
        )
      )
        messages.notice.value =
          kind === "preset" ? "预设已保存。" : "工程已保存。";
    });
  }
  return {
    name,
    busy,
    projectInput,
    presetInput,
    choose,
    selected,
    saveCurrent,
    project,
    preset,
    load,
  };
}
