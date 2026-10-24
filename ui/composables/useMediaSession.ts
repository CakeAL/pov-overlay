import { nextTick, onBeforeUnmount, ref, shallowRef, computed,watch } from "vue";
import {
  importBrowserGpx,
  importBrowserVideo,
  importNativeGpx,importNativeGpxFiles,
  importNativeVideo,
  native,
  releaseVideo,
  VIDEO_EXTENSIONS,
} from "../infrastructure/media";
import {readImageFile,readNativeImage,IMAGE_EXTENSIONS} from "../infrastructure/images";
import type {ImageAsset,TrackSource} from "../domain/types";
import {mergeTracks} from "../domain/mergeTracks";
import type { Track, VideoAsset } from "../domain/types";
import type { EditorMessages } from "./useMessages";

export function useMediaSession(messages: EditorMessages) {
  const track = shallowRef<Track | null>(null),
    gpxName = ref("");
  const asset = shallowRef<VideoAsset | null>(null),
    busy = ref(false);
  const joinSources=ref(true),mergeInfo=ref({overwritten:0,breaks:0});
  const sources=shallowRef<TrackSource[]>([]);
  const image = shallowRef<ImageAsset|null>(null);
  const imageInput = ref<HTMLInputElement>();
  const backgroundMode = ref<"none"|"image"|"video">("none");
  const activeVideo = computed(()=>backgroundMode.value === "video" ? asset.value : null);
  const gpxInput = ref<HTMLInputElement>(),
    videoInput = ref<HTMLInputElement>();
  function rebuild(){const result=mergeTracks(sources.value,joinSources.value);track.value=result.track;mergeInfo.value={overwritten:result.overwritten,breaks:result.breaks};gpxName.value=sources.value.filter(s=>s.enabled!==false).map(s=>s.name).join('、');}
  function restoreSources(values:TrackSource[]){sources.value=values;rebuild();}
  function acceptTrack(result:{track:Track;name:string}){if(sources.value.length>=100)throw new Error('最多导入 100 段 GPX。');restoreSources([...sources.value,{id:crypto.randomUUID(),...result,enabled:true}]);}
  function removeSource(id:string){restoreSources(sources.value.filter(s=>s.id!==id));}
  function toggleSource(id:string){restoreSources(sources.value.map(s=>s.id===id?{...s,enabled:s.enabled===false}:s));}
  watch(joinSources,rebuild);
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
      const results=await importNativeGpxFiles();
      for(const result of results)acceptTrack(result);
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
      files=Array.from(input.files??[]);
    try {
      if(files.length)await runImport(async()=>{for(const file of kind==='gpx'?files:files.slice(0,1)){if(kind==='gpx')acceptTrack(await importBrowserGpx(file));else await acceptVideo(await importBrowserVideo(file));}});
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
    sources,joinSources,mergeInfo,restoreSources,removeSource,toggleSource,
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
