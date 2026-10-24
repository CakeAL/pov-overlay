import { onBeforeUnmount, onMounted, ref } from "vue";
import { native } from "../infrastructure/media";
import type { MediaSession } from "./useMediaSession";

export function useFileDrop(media: MediaSession) {
  const dropActive = ref(false);
  let unlisten: (() => void) | undefined,
    disposed = false;
  async function dropped(event: DragEvent) {
    dropActive.value = false;
    if (!native)
      await media.importFiles(Array.from(event.dataTransfer?.files ?? []));
  }
  onMounted(async () => {
    if (!native) return;
    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
    const stop = await getCurrentWebview().onDragDropEvent((event) => {
      dropActive.value =
        event.payload.type === "enter" || event.payload.type === "over";
      if (event.payload.type === "drop")
        void media.importPaths(event.payload.paths);
    });
    if (disposed) stop();
    else unlisten = stop;
  });
  onBeforeUnmount(() => {
    disposed = true;
    unlisten?.();
  });
  return { dropActive, dropped };
}
