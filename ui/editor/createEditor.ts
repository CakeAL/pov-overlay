import { useVideoExport } from "../composables/useVideoExport";
import { useTrackProfile } from "../composables/useTrackProfile";
import { useTelemetrySettings } from "../composables/useTelemetrySettings";
import { useSvgElements } from "../composables/useSvgElements";
import { useDocuments } from "../composables/useDocuments";
import { reactive } from "vue";
import { useMessages } from "../composables/useMessages";
import { useMediaSession } from "../composables/useMediaSession";
import { useAlignment } from "../composables/useAlignment";
import { usePlayback } from "../composables/usePlayback";
import { useCanvasViewport } from "../composables/useCanvasViewport";
import { useWidgetLayout } from "../composables/useWidgetLayout";
import { useTimeline } from "../composables/useTimeline";
import { useFileDrop } from "../composables/useFileDrop";
import { useEditorShortcuts } from "../composables/useEditorShortcuts";

/** Composition root: owns one editor session and wires independent feature controllers. */
export function createEditor() {
  const messages = useMessages();
  const media = useMediaSession(messages);
  const alignment = useAlignment(media.track, media.activeVideo, messages);
  const playback = usePlayback(media, messages);
  const viewport = useCanvasViewport(playback.ratio);
  const layout = useWidgetLayout(playback.ratio, viewport.stage);
  const telemetry = useTelemetrySettings();
  const svgElements = useSvgElements(layout, messages);
  const timeline = useTimeline(media, playback, alignment, telemetry);
  const profile = useTrackProfile(timeline, playback, alignment, media);
  const documents = useDocuments(
    media,
    layout,
    playback,
    alignment,
    telemetry,
    messages,
  );
  const videoExport = useVideoExport(timeline, layout, playback, alignment, media, telemetry, documents, messages);
  const drop = useFileDrop(media);
  useEditorShortcuts(layout, playback, viewport);
  return reactive({
    documents,
    videoExport,
    messages,
    media,
    alignment,
    playback,
    viewport,
    layout,
    timeline,
    profile,
    telemetry,
    svgElements,
    drop,
  });
}
export type Editor = ReturnType<typeof createEditor>;
