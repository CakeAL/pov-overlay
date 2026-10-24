import { nextTick, onBeforeUnmount, ref, shallowRef, computed } from "vue";
import {
  importBrowserGpx,
  importBrowserVideo,
  importNativeGpx,
  importNativeVideo,
  native,
  releaseVideo,
  VIDEO_EXTENSIONS,
} from "../infrastructure/media";
import {readImageFile,readNativeImage,IMAGE_EXTENSIONS} from "../infrastructure/images";
import type {ImageAsset,TrackSource} from "../domain/types";
import type { Track, VideoAsset } from "../domain/types";
import type { EditorMessages } from "./useMessages";

export function useMediaSession(messages: EditorMessages) {
  const track = shallowRef<Track | null>(null),
    gpxName = ref("");
  const asset = shallowRef<VideoAsset | null>(null),
    busy = ref(false);
  const sources=shallowRef<TrackSource[]>([]);
  const image = shallowRef<ImageAsset|null>(null);
  const imageInput = ref<HTMLInputElement>();
  const backgroundMode = ref<"none"|"image"|"video">("none");
  const activeVideo = computed(()=>backgroundMode.value === "video" ? asset.value : null);
  const gpxInput = ref<HTMLInputElement>(),
    videoInput = ref<HTMLInputElement>();
  function acceptTrack(result: { track: Track; name: string }) {
    sources.value=[{id:crypto.randomUUID(),name:result.name,track:result.track}];
    track.value = result.track;
    gpxName.value = result.name;
    if (result.track.skippedPoints)
      messages.notice.value = `已忽略 ${result.track.skippedPoints} 个缺少时间戳或重复的轨迹点。`;
  }
  async function acceptVideo(result: VideoAsset) {
    const previous = asset.value;
    asset.value = result;
    backgroundMode.value = "video";
    await nextTick();
    releaseVideo(previous);
  }
  async function runImport(action: () => Promise<void>) {
    if (busy.value) return;
    busy.value = true;
    messages.clear();
    try {
      await action();
    } catch (reason) {
      messages.report(reason);
    } finally {
      busy.value = false;
    }
  }
  async function chooseGpx() {
    if (!native) {
      gpxInput.value?.click();
      return;
    }
    await runImport(async () => {
      const result = await importNativeGpx();
      if (result) acceptTrack(result);
    });
  }
  async function chooseVideo() {
    if (!native) {
      videoInput.value?.click();
      return;
    }
    await runImport(async () => {
      const result = await importNativeVideo();
      if (result) await acceptVideo(result);
    });
  }
  function acceptImage(value:ImageAsset){image.value=value;backgroundMode.value="image";}
  async function chooseImage(){if(!native){imageInput.value?.click();return;} await runImport(async()=>{const value=await readNativeImage();if(value)acceptImage(value);});}
  async function selectedImage(event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];try{if(file)await runImport(async()=>acceptImage(await readImageFile(file)));}finally{input.value="";}}
  async function selectedFile(event: Event, kind: "gpx" | "video") {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    try {
      if (file)
        await runImport(async () => {
          if (kind === "gpx") acceptTrack(await importBrowserGpx(file));
          else await acceptVideo(await importBrowserVideo(file));
        });
    } finally {
      input.value = "";
    }
  }
  async function importFiles(files: File[]) {
    await runImport(async () => {
      for (const file of files) {
        if (/\.gpx$/i.test(file.name))
          acceptTrack(await importBrowserGpx(file));
        else if(IMAGE_EXTENSIONS.includes(file.name.split(".").at(-1)?.toLowerCase()??"")) acceptImage(await readImageFile(file));
        else if (
          VIDEO_EXTENSIONS.includes(
            file.name.split(".").at(-1)?.toLowerCase() ?? "",
          )
        )
          await acceptVideo(await importBrowserVideo(file));
        else throw new Error("请选择 GPX 轨迹或视频文件。");
      }
    });
  }
  async function importPaths(paths: string[]) {
    await runImport(async () => {
      for (const path of paths) {
        if (/\.gpx$/i.test(path)) {
          const result = await importNativeGpx(path);
          if (result) acceptTrack(result);
        } else if(IMAGE_EXTENSIONS.includes(path.split(".").at(-1)?.toLowerCase()??"")){const result=await readNativeImage(path);if(result)acceptImage(result);
        } else {
          const result = await importNativeVideo(path);
          if (result) await acceptVideo(result);
        }
      }
    });
  }
  onBeforeUnmount(() => releaseVideo(asset.value));
  return {
    sources,
    image,imageInput,backgroundMode,activeVideo,chooseImage,selectedImage,acceptImage,
    track,
    gpxName,
    asset,
    busy,
    gpxInput,
    videoInput,
    chooseGpx,
    chooseVideo,
    selectedFile,
    importFiles,
    importPaths,
    acceptTrack,
    acceptVideo,
  };
}
export type MediaSession = ReturnType<typeof useMediaSession>;
