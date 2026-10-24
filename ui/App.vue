<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import HSwitch from "@celestia-island/hikari/components/HkSwitch.tsx";
import {
  Check,
  ChevronRight,
  Crosshair,
  Eye,
  EyeOff,
  FileVideo,
  Gauge,
  GripVertical,
  Info,
  Layers,
  Link2,
  LockKeyhole,
  MapPin,
  MousePointer2,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Route,
  ScanLine,
  Settings2,
  ShieldCheck,
  SkipBack,
  Undo2,
  UnlockKeyhole,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-vue-next";
import {
  alignmentOffset,
  formatCoordinate,
  formatTime,
  sampleAt,
} from "./lib/telemetry";
import {
  importBrowserGpx,
  importBrowserVideo,
  importNativeGpx,
  importNativeVideo,
  native,
  releaseVideo,
  VIDEO_EXTENSIONS,
} from "./lib/media";
import {
  defaultWidgets,
  type Track,
  type VideoAsset,
  type Widget,
} from "./lib/types";

const track = ref<Track | null>(null),
  gpxName = ref("");
const asset = ref<VideoAsset | null>(null),
  video = ref<HTMLVideoElement>();
const gpxInput = ref<HTMLInputElement>(),
  videoInput = ref<HTMLInputElement>();
const busy = ref(false),
  error = ref(""),
  notice = ref("");
const widgets = ref<Widget[]>(defaultWidgets()),
  selectedId = ref("speed");
const selected = computed(() =>
  widgets.value.find((widget) => widget.id === selectedId.value),
);
const currentTime = ref(0),
  videoDuration = ref(0),
  playing = ref(false),
  muted = ref(true);
const offset = ref(0),
  alignmentKnown = ref(false),
  syncMode = ref<"auto" | "manual" | "none">("none");
const manualStart = ref(""),
  showTiming = ref(false),
  snapEnabled = ref(true),
  showSafeArea = ref(true);
const stage = ref<HTMLElement>(),
  stageWrap = ref<HTMLElement>(),
  stageSize = ref({ width: 960, height: 540 });
const ratio = ref(16 / 9),
  dropActive = ref(false);
const guides = ref({ x: false, y: false });
let resizeObserver: ResizeObserver | undefined,
  animation = 0,
  unlisten: (() => void) | undefined;
const sourceSize = ref({ width: 0, height: 0 });
const undoStack = ref<string[]>([]),
  redoStack = ref<string[]>([]);
const duration = computed(() =>
  asset.value
    ? videoDuration.value
    : track.value
      ? (track.value.endMs - track.value.startMs) / 1000
      : 0,
);
const absoluteTime = computed(() =>
  track.value
    ? track.value.startMs + (offset.value + currentTime.value) * 1000
    : null,
);
const sample = computed(() =>
  track.value &&
  (!asset.value || alignmentKnown.value) &&
  absoluteTime.value !== null
    ? sampleAt(track.value, absoluteTime.value)
    : null,
);
const status = computed(() =>
  !track.value
    ? "等待 GPX 轨迹"
    : asset.value && !alignmentKnown.value
      ? "待设置视频时间"
      : !sample.value
        ? "当前时间无 GPX 数据"
        : "轨迹已连接",
);
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const dateText = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Date(value).toLocaleString("zh-CN", { hour12: false });
const offsetLabel = computed(
  () => `${offset.value >= 0 ? "+" : ""}${offset.value.toFixed(2)} s`,
);
const coverage = computed(() => {
  if (!track.value || !duration.value || (asset.value && !alignmentKnown.value))
    return null;
  const left = Math.max(0, -offset.value),
    right = Math.min(
      duration.value,
      (track.value.endMs - track.value.startMs) / 1000 - offset.value,
    );
  return right > left
    ? {
        left: `${(left / duration.value) * 100}%`,
        width: `${((right - left) / duration.value) * 100}%`,
      }
    : null;
});
const timelineTicks = computed(() =>
  Array.from({ length: 7 }, (_, index) =>
    formatTime((duration.value * index) / 6),
  ),
);
const routePath = computed(() => {
  if (!track.value) return "";
  const points = track.value.samples.filter(
    (_, index) =>
      index % Math.max(1, Math.floor(track.value!.samples.length / 120)) === 0,
  );
  const lats = points.map((point) => point.latitude),
    lons = points.map((point) => point.longitude);
  const minLat = Math.min(...lats),
    maxLat = Math.max(...lats),
    minLon = Math.min(...lons),
    maxLon = Math.max(...lons);
  return points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${8 + ((point.longitude - minLon) / (maxLon - minLon || 1)) * 104},${44 - ((point.latitude - minLat) / (maxLat - minLat || 1)) * 36}`,
    )
    .join(" ");
});

function remember() {
  const state = JSON.stringify(widgets.value);
  if (undoStack.value.at(-1) !== state) undoStack.value.push(state);
  if (undoStack.value.length > 50) undoStack.value.shift();
  redoStack.value = [];
}
function undo() {
  const state = undoStack.value.pop();
  if (state) {
    redoStack.value.push(JSON.stringify(widgets.value));
    widgets.value = JSON.parse(state);
  }
}
function redo() {
  const state = redoStack.value.pop();
  if (state) {
    undoStack.value.push(JSON.stringify(widgets.value));
    widgets.value = JSON.parse(state);
  }
}
function resetLayout() {
  remember();
  widgets.value = defaultWidgets();
  selectedId.value = "speed";
}
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
    error.value = "请先导入 GPX，并填写有效的视频起始时间。";
    return;
  }
  offset.value = alignmentOffset(track.value, timestamp);
  alignmentKnown.value = true;
  syncMode.value = "manual";
  error.value = "";
}
function acceptTrack(result: { track: Track; name: string }) {
  track.value = result.track;
  gpxName.value = result.name;
  offset.value = 0;
  alignmentKnown.value = false;
  syncMode.value = "none";
  if (!asset.value) currentTime.value = 0;
  autoAlign();
  if (result.track.skippedPoints)
    notice.value = `已忽略 ${result.track.skippedPoints} 个缺少时间戳或重复的轨迹点。`;
}
async function acceptVideo(result: VideoAsset) {
  if (video.value) video.value.pause();
  releaseVideo(asset.value);
  asset.value = result;
  currentTime.value = 0;
  playing.value = false;
  videoDuration.value = result.duration;
  ratio.value = 16 / 9;
  offset.value = 0;
  alignmentKnown.value = false;
  syncMode.value = "none";
  manualStart.value =
    result.capturedAtMs == null ? "" : localInput(result.capturedAtMs);
  autoAlign();
  if (result.capturedAtMs === null) showTiming.value = true;
  await nextTick();
  video.value?.load();
  fitStage();
}
async function runImport(action: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  notice.value = "";
  try {
    await action();
  } catch (reason) {
    error.value = String(reason instanceof Error ? reason.message : reason);
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
async function selectedFile(event: Event, type: "gpx" | "video") {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (file)
    await runImport(async () => {
      if (type === "gpx") acceptTrack(await importBrowserGpx(file));
      else await acceptVideo(await importBrowserVideo(file));
    });
  input.value = "";
}
async function dropped(event: DragEvent) {
  dropActive.value = false;
  if (native) return;
  const files = Array.from(event.dataTransfer?.files ?? []);
  await runImport(async () => {
    for (const file of files) {
      if (/\.gpx$/i.test(file.name)) acceptTrack(await importBrowserGpx(file));
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
async function loadDemo() {
  await runImport(async () => {
    const response = await fetch("/demo/ride.gpx");
    if (!response.ok) throw new Error("示例轨迹加载失败。");
    acceptTrack(
      await importBrowserGpx(
        new File([await response.text()], "morning-ride.gpx"),
      ),
    );
    await acceptVideo({
      name: "morning-ride.mp4 · 合成示例",
      url: "/demo/ride.mp4",
      capturedAtMs: Date.parse("2026-10-24T00:00:12Z"),
      timeSource: "示例视频拍摄时间（UTC）",
      warning: null,
      duration: 12,
    });
    notice.value =
      "示例：视频从轨迹第 12 秒开始，已自动对齐。可拖动组件、播放或调整时间偏移。";
  });
}
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
  fitStage();
  clampAll();
}
function videoError() {
  error.value =
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
      error.value = "视频无法播放，请确认视频编码受当前系统支持。";
    }
  } else video.value.pause();
}
function seek(time: number) {
  currentTime.value = Math.max(0, Math.min(duration.value, time));
  if (video.value) video.value.currentTime = currentTime.value;
}
function fitStage() {
  const bounds = stageWrap.value?.getBoundingClientRect();
  if (!bounds) return;
  const width = Math.max(
    0,
    Math.min(bounds.width - 56, (bounds.height - 56) * ratio.value),
  );
  stageSize.value = { width, height: width / ratio.value };
}
function dimensions(widget: Widget) {
  const width = (widget.kind === "speed" ? 0.19 : 0.3) * widget.scale;
  return {
    width,
    height: (width * ratio.value) / (widget.kind === "speed" ? 1.55 : 3.35),
  };
}
function clampWidget(widget: Widget) {
  const size = dimensions(widget);
  widget.x = Math.max(0, Math.min(1 - size.width, widget.x));
  widget.y = Math.max(0, Math.min(1 - size.height, widget.y));
}
function clampAll() {
  widgets.value.forEach(clampWidget);
}
function updateScale(event: Event) {
  if (!selected.value) return;
  selected.value.scale = Number((event.target as HTMLInputElement).value);
  clampWidget(selected.value);
}
function widgetStyle(widget: Widget) {
  const size = dimensions(widget);
  return {
    left: `${widget.x * 100}%`,
    top: `${widget.y * 100}%`,
    width: `${size.width * 100}%`,
    aspectRatio: widget.kind === "speed" ? "1.55" : "3.35",
    "--widget-accent": widget.color,
    "--widget-alpha": String(widget.opacity / 100),
    "--widget-scale": String(widget.scale),
  };
}
let drag: {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  scale: number;
  mode: "move" | "resize";
  rect: DOMRect;
} | null = null;
function startDrag(
  event: PointerEvent,
  widget: Widget,
  mode: "move" | "resize" = "move",
) {
  selectedId.value = widget.id;
  if (widget.locked || !stage.value || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  remember();
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  drag = {
    id: widget.id,
    startX: event.clientX,
    startY: event.clientY,
    x: widget.x,
    y: widget.y,
    scale: widget.scale,
    mode,
    rect: stage.value.getBoundingClientRect(),
  };
}
function moveDrag(event: PointerEvent) {
  if (!drag) return;
  const widget = widgets.value.find((item) => item.id === drag!.id)!;
  const dx = (event.clientX - drag.startX) / drag.rect.width,
    dy = (event.clientY - drag.startY) / drag.rect.height;
  guides.value = { x: false, y: false };
  if (drag.mode === "resize")
    widget.scale = Math.max(
      0.65,
      Math.min(1.65, drag.scale + dx / (widget.kind === "speed" ? 0.19 : 0.3)),
    );
  else {
    widget.x = drag.x + dx;
    widget.y = drag.y + dy;
    if (snapEnabled.value && !event.altKey) {
      const size = dimensions(widget);
      const centerX = 0.5 - size.width / 2,
        centerY = 0.5 - size.height / 2;
      if (Math.abs(widget.x - centerX) * drag.rect.width < 7) {
        widget.x = centerX;
        guides.value.x = true;
      }
      if (Math.abs(widget.y - centerY) * drag.rect.height < 7) {
        widget.y = centerY;
        guides.value.y = true;
      }
      for (const edge of [0.04, 0.96 - size.width])
        if (Math.abs(widget.x - edge) * drag.rect.width < 7) widget.x = edge;
      for (const edge of [0.04, 0.96 - size.height])
        if (Math.abs(widget.y - edge) * drag.rect.height < 7) widget.y = edge;
    }
  }
  clampWidget(widget);
}
function endDrag() {
  drag = null;
  guides.value = { x: false, y: false };
}
function toggleVisible(widget: Widget) {
  remember();
  widget.visible = !widget.visible;
}
function handleKey(event: KeyboardEvent) {
  if (
    (event.target as HTMLElement).closest(
      'input, textarea, select, button, [contenteditable="true"]',
    )
  )
    return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
    return;
  }
  if (event.code === "Space") {
    event.preventDefault();
    void togglePlay();
    return;
  }
  if (
    selected.value &&
    !selected.value.locked &&
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
  ) {
    event.preventDefault();
    remember();
    const amount = event.shiftKey ? 10 : 1;
    if (event.key === "ArrowLeft")
      selected.value.x -= amount / stageSize.value.width;
    if (event.key === "ArrowRight")
      selected.value.x += amount / stageSize.value.width;
    if (event.key === "ArrowUp")
      selected.value.y -= amount / stageSize.value.height;
    if (event.key === "ArrowDown")
      selected.value.y += amount / stageSize.value.height;
    clampWidget(selected.value);
  }
}
watch(muted, (value) => {
  if (video.value) video.value.muted = value;
});
onMounted(async () => {
  resizeObserver = new ResizeObserver(fitStage);
  if (stageWrap.value) resizeObserver.observe(stageWrap.value);
  fitStage();
  tick();
  window.addEventListener("keydown", handleKey);
  if (native) {
    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
    unlisten = await getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "over" || event.payload.type === "enter")
        dropActive.value = true;
      else if (event.payload.type === "leave") dropActive.value = false;
      else if (event.payload.type === "drop") {
        dropActive.value = false;
        const paths = event.payload.paths;
        void runImport(async () => {
          for (const path of paths) {
            if (/\.gpx$/i.test(path)) {
              const result = await importNativeGpx(path);
              if (result) acceptTrack(result);
            } else {
              const result = await importNativeVideo(path);
              if (result) await acceptVideo(result);
            }
          }
        });
      }
    });
  }
});
onBeforeUnmount(() => {
  cancelAnimationFrame(animation);
  resizeObserver?.disconnect();
  unlisten?.();
  window.removeEventListener("keydown", handleKey);
  releaseVideo(asset.value);
});
</script>

<template>
  <div
    class="app-shell"
    @dragover.prevent="dropActive = true"
    @dragleave.prevent="dropActive = false"
    @drop.prevent="dropped"
  >
    <header class="app-header">
      <a class="brand" href="#" aria-label="POV Overlay 首页" @click.prevent
        ><span class="brand-mark"
          ><svg viewBox="0 0 24 24" fill="none">
            <path
              d="M6 19V5h8l4 4-4 4H6M11 9h3"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linejoin="round"
            /></svg></span
        ><span
          >pov<span class="brand-light">/</span>overlay<span class="brand-dot"
            >.</span
          ></span
        ></a
      >
      <span class="header-divider"></span
      ><span class="header-workspace"
        >轨迹画布 <ChevronRight :size="13" /> <span>未命名项目</span></span
      >
      <div class="header-actions">
        <span class="local-badge"><ShieldCheck :size="14" /> 本地处理</span
        ><HButton variant="outline" size="sm" :disabled="busy" @click="loadDemo"
          ><Play :size="13" /> 加载示例</HButton
        >
      </div>
    </header>

    <div v-if="error" class="message-banner error" role="alert">
      <Info :size="16" /><span>{{ error }}</span
      ><button aria-label="关闭错误提示" @click="error = ''">
        <X :size="15" />
      </button>
    </div>
    <div v-if="notice" class="message-banner notice" role="status">
      <Check :size="16" /><span>{{ notice }}</span
      ><button aria-label="关闭提示" @click="notice = ''">
        <X :size="15" />
      </button>
    </div>

    <main class="workspace">
      <aside class="inspector">
        <div class="inspector-heading">
          <div>
            <p class="eyebrow">YOUR RIDE, YOUR FRAME</p>
            <h1>让轨迹进入画面</h1>
          </div>
          <span class="version-tag">BETA 01</span>
        </div>
        <div class="inspector-scroll">
          <section class="panel-section">
            <div class="section-title">
              <span><span class="section-index">01</span> 素材</span
              ><span class="muted"
                >{{ Number(!!track) + Number(!!asset) }} / 2</span
              >
            </div>
            <button
              class="asset-card"
              :class="{ imported: track }"
              :disabled="busy"
              @click="chooseGpx"
              data-testid="import-gpx"
            >
              <span class="asset-icon track-icon"><Route :size="20" /></span
              ><span class="asset-copy"
                ><strong>{{ gpxName || "导入 GPX 轨迹" }}</strong
                ><small>{{
                  track
                    ? `${track.samples.length.toLocaleString()} 个轨迹点 · ${(track.distanceMeters / 1000).toFixed(2)} km`
                    : "速度、位置，来自你的每一段旅程"
                }}</small></span
              ><Check v-if="track" :size="15" class="success-icon" /><Plus
                v-else
                :size="17"
              />
            </button>
            <button
              class="asset-card"
              :class="{ imported: asset }"
              :disabled="busy"
              @click="chooseVideo"
              data-testid="import-video"
            >
              <span class="asset-icon video-icon"><FileVideo :size="20" /></span
              ><span class="asset-copy"
                ><strong>{{ asset?.name || "导入预览视频" }}</strong
                ><small>{{
                  asset
                    ? `${formatTime(videoDuration)} · 仅用于画布预览`
                    : "MP4 / MOV · 文件始终留在本地"
                }}</small></span
              ><Check v-if="asset" :size="15" class="success-icon" /><Plus
                v-else
                :size="17"
              />
            </button>
            <input
              ref="gpxInput"
              data-testid="gpx-file"
              class="file-input"
              type="file"
              accept=".gpx,application/gpx+xml"
              @change="selectedFile($event, 'gpx')"
            />
            <input
              ref="videoInput"
              data-testid="video-file"
              class="file-input"
              type="file"
              accept="video/*,.mov,.mkv,.mts,.m2ts"
              @change="selectedFile($event, 'video')"
            />
            <div v-if="track" class="track-summary">
              <svg viewBox="0 0 120 52" aria-hidden="true">
                <path :d="routePath" />
              </svg>
              <div>
                <span>GPX 起始时间</span
                ><strong>{{ dateText(track.startMs) }}</strong
                ><small
                  >{{ formatTime((track.endMs - track.startMs) / 1000) }} ·
                  {{ timeZone }}</small
                >
              </div>
            </div>
          </section>

          <section class="panel-section sync-section">
            <div class="section-title">
              <span><span class="section-index">02</span> 时间同步</span
              ><span
                v-if="syncMode !== 'none'"
                class="status-pill"
                :class="{ manual: syncMode === 'manual' }"
                ><span></span
                >{{ syncMode === "auto" ? "自动对齐" : "手动对齐" }}</span
              >
            </div>
            <div class="sync-description">
              <Link2 :size="17" />
              <p>
                {{
                  syncMode === "auto"
                    ? "已根据视频时间元数据对齐 GPX。"
                    : !track || !asset
                      ? "导入轨迹与视频后，自动匹配起始时间。"
                      : alignmentKnown
                        ? "已应用自定义时间偏移。"
                        : "视频没有可用的拍摄时间，请手动设置。"
                }}
              </p>
            </div>
            <div class="offset-control">
              <span>视频起点在 GPX 的位置</span
              ><label
                ><input
                  aria-label="时间偏移（秒）"
                  data-testid="time-offset"
                  type="number"
                  step="0.1"
                  :disabled="!track"
                  :value="offset"
                  @change="setManualOffset"
                /><span>s</span></label
              >
            </div>
            <button
              class="text-button timing-toggle"
              @click="showTiming = !showTiming"
            >
              <Settings2 :size="13" />
              {{ showTiming ? "收起时间设置" : "调整起始时间"
              }}<ChevronRight :size="13" :class="{ rotated: showTiming }" />
            </button>
            <div v-if="showTiming" class="timing-details">
              <label class="field-label" for="video-start"
                >视频起始时间 <span>{{ timeZone }}</span></label
              >
              <input
                id="video-start"
                data-testid="video-start"
                class="text-input"
                type="datetime-local"
                step="0.001"
                v-model="manualStart"
                :disabled="!track"
              />
              <div class="timing-actions">
                <HButton
                  size="xs"
                  variant="secondary"
                  :disabled="!track || !manualStart"
                  @click="applyManualTime"
                  >应用时间</HButton
                ><button
                  class="text-button"
                  :disabled="!track || asset?.capturedAtMs == null"
                  @click="autoAlign"
                >
                  恢复自动对齐
                </button>
              </div>
              <p class="field-hint">
                {{
                  asset?.timeSource ||
                  "未检测到拍摄时间；不会使用文件修改时间。"
                }}
              </p>
              <p v-if="asset?.capturedAtMs != null" class="field-hint">
                元数据：{{
                  dateText(asset.capturedAtMs)
                }}。若视频经过剪辑或设备时钟不准，可在此校正。
              </p>
            </div>
          </section>

          <section class="panel-section layers-section">
            <div class="section-title">
              <span><span class="section-index">03</span> 画布元素</span
              ><span class="muted"
                >{{
                  widgets.filter((widget) => widget.visible).length
                }}
                个可见</span
              >
            </div>
            <div
              v-for="widget in widgets"
              :key="widget.id"
              class="layer-row"
              :class="{
                active: selectedId === widget.id,
                hidden: !widget.visible,
              }"
            >
              <button class="layer-select" @click="selectedId = widget.id">
                <GripVertical :size="13" class="layer-grip" /><span
                  class="layer-icon"
                  ><Gauge v-if="widget.kind === 'speed'" :size="18" /><MapPin
                    v-else
                    :size="18" /></span
                ><span
                  ><strong>{{ widget.label }}</strong
                  ><small>{{
                    widget.kind === "speed" ? "SPEED" : "COORDINATES"
                  }}</small></span
                >
              </button>
              <button
                class="icon-button"
                :aria-label="`${widget.visible ? '隐藏' : '显示'}${widget.label}`"
                :title="widget.visible ? '隐藏' : '显示'"
                @click="toggleVisible(widget)"
              >
                <Eye v-if="widget.visible" :size="15" /><EyeOff
                  v-else
                  :size="15"
                />
              </button>
              <button
                class="icon-button"
                :aria-label="`${widget.locked ? '解锁' : '锁定'}${widget.label}`"
                :title="widget.locked ? '解锁位置' : '锁定位置'"
                @click="
                  remember();
                  widget.locked = !widget.locked;
                "
              >
                <LockKeyhole v-if="widget.locked" :size="14" /><UnlockKeyhole
                  v-else
                  :size="14"
                />
              </button>
            </div>
            <p class="section-hint">
              <MousePointer2 :size="12" /> 在右侧画布拖动元素，自由排布。
            </p>
          </section>

          <section v-if="selected" class="panel-section properties-section">
            <div class="section-title">
              <span><Settings2 :size="15" /> {{ selected.label }}设置</span
              ><button
                class="text-button"
                @click="
                  remember();
                  Object.assign(
                    selected!,
                    defaultWidgets().find((item) => item.id === selected!.id),
                  );
                "
              >
                重置
              </button>
            </div>
            <div class="position-fields">
              <label
                >X
                <input
                  aria-label="元素 X 位置（百分比）"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  :disabled="selected.locked"
                  :value="(selected.x * 100).toFixed(1)"
                  @focus="remember"
                  @change="
                    selected.x =
                      Number(($event.target as HTMLInputElement).value) / 100;
                    clampWidget(selected);
                  "
                /><span>%</span></label
              ><label
                >Y
                <input
                  aria-label="元素 Y 位置（百分比）"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  :disabled="selected.locked"
                  :value="(selected.y * 100).toFixed(1)"
                  @focus="remember"
                  @change="
                    selected.y =
                      Number(($event.target as HTMLInputElement).value) / 100;
                    clampWidget(selected);
                  "
                /><span>%</span></label
              >
            </div>
            <label class="slider-label"
              >大小 <span>{{ Math.round(selected.scale * 100) }}%</span></label
            ><input
              class="property-slider"
              aria-label="元素大小"
              type="range"
              min="0.65"
              max="1.65"
              step="0.01"
              :value="selected.scale"
              :disabled="selected.locked"
              @pointerdown="remember"
              @input="updateScale"
            />
            <label class="slider-label"
              >背景不透明度 <span>{{ selected.opacity }}%</span></label
            ><input
              class="property-slider"
              aria-label="背景不透明度"
              type="range"
              min="0"
              max="100"
              step="1"
              v-model.number="selected.opacity"
              @pointerdown="remember"
            />
            <div class="color-setting">
              <span>强调色</span>
              <div class="color-swatches">
                <button
                  v-for="color in ['#c7f284', '#ffffff', '#8bc9f4', '#ffbc8c']"
                  :key="color"
                  :style="{ background: color }"
                  :class="{ checked: selected.color === color }"
                  :aria-label="`强调色 ${color}`"
                  @click="
                    remember();
                    selected.color = color;
                  "
                >
                  <Check v-if="selected.color === color" :size="11" /></button
                ><label class="custom-color" title="自定义颜色"
                  ><Plus :size="12" /><input
                    aria-label="自定义强调色"
                    type="color"
                    v-model="selected.color"
                    @focus="remember"
                /></label>
              </div>
            </div>
          </section>
        </div>
        <div class="inspector-footer">
          <span class="tiny-dot"></span
          ><span>每一段旅程，都有自己的坐标。</span>
        </div>
      </aside>

      <section class="canvas-workspace">
        <div class="canvas-topbar">
          <div class="canvas-heading">
            <span class="canvas-heading-icon"><Layers :size="18" /></span>
            <h2>预览画布</h2>
            <span class="canvas-tag">{{
              asset ? "VIDEO + OVERLAY" : "OVERLAY"
            }}</span>
          </div>
          <div class="canvas-actions">
            <button
              class="icon-button"
              aria-label="撤销"
              title="撤销 ⌘Z"
              :disabled="!undoStack.length"
              @click="undo"
            >
              <Undo2 :size="16" /></button
            ><button
              class="icon-button"
              aria-label="重做"
              title="重做 ⇧⌘Z"
              :disabled="!redoStack.length"
              @click="redo"
            >
              <Redo2 :size="16" /></button
            ><span class="action-divider"></span
            ><button class="text-button" @click="resetLayout">
              <RotateCcw :size="14" /> 重置布局
            </button>
          </div>
        </div>
        <div class="canvas-options">
          <span class="aspect-label"
            ><ScanLine :size="14" />
            {{
              asset && sourceSize.width
                ? `${sourceSize.width} × ${sourceSize.height}`
                : "16 : 9"
            }}
            <span>·</span> 自适应</span
          >
          <div>
            <label
              ><HSwitch
                v-model="showSafeArea"
                size="sm"
                label="安全边距" /></label
            ><label
              ><HSwitch v-model="snapEnabled" size="sm" label="智能吸附"
            /></label>
          </div>
        </div>

        <div
          ref="stageWrap"
          class="stage-wrap"
          :class="{ 'is-drag-over': dropActive }"
        >
          <div
            ref="stage"
            class="preview-stage"
            data-testid="preview-stage"
            :style="{
              width: `${stageSize.width}px`,
              height: `${stageSize.height}px`,
            }"
            @pointerdown.self="selectedId = ''"
          >
            <video
              v-if="asset"
              ref="video"
              :key="asset.url"
              :src="asset.url"
              :muted="muted"
              playsinline
              preload="metadata"
              @loadedmetadata="loadedMetadata"
              @timeupdate="currentTime = video?.currentTime || 0"
              @play="playing = true"
              @pause="playing = false"
              @ended="playing = false"
              @error="videoError"
            />
            <div v-else class="empty-stage" @pointerdown="selectedId = ''">
              <svg
                class="contour-art"
                viewBox="0 0 960 540"
                preserveAspectRatio="xMidYMid slice"
                aria-hidden="true"
              >
                <g
                  v-for="i in 13"
                  :key="i"
                  :transform="`translate(${(i - 7) * 24} ${(i - 7) * 16})`"
                >
                  <path
                    d="M-170 510C-60 230 110 330 196 164S456 110 495 245 690 442 810 280 970 242 1110 50"
                  />
                </g>
              </svg>
              <div class="empty-content">
                <div class="empty-video-icon">
                  <FileVideo :size="28" :stroke-width="1.3" />
                </div>
                <h3>每一帧，都有迹可循</h3>
                <p>导入视频，预览你的运动数据叠加效果</p>
                <HButton
                  variant="secondary"
                  size="sm"
                  :disabled="busy"
                  @click.stop="chooseVideo"
                  ><Upload :size="14" /> 选择预览视频</HButton
                ><span>也可以将 GPX 与视频直接拖到这里</span>
              </div>
            </div>
            <div v-if="showSafeArea" class="safe-area" aria-hidden="true">
              <i v-for="i in 4" :key="i"></i>
            </div>
            <div v-if="guides.x" class="snap-guide vertical"></div>
            <div v-if="guides.y" class="snap-guide horizontal"></div>
            <div
              v-for="widget in widgets.filter((item) => item.visible)"
              :key="widget.id"
              :data-testid="`widget-${widget.id}`"
              class="overlay-widget"
              :class="[
                widget.kind,
                { selected: selectedId === widget.id, locked: widget.locked },
              ]"
              :style="widgetStyle(widget)"
              tabindex="0"
              :aria-label="`${widget.label}组件，可拖动定位`"
              @focus="selectedId = widget.id"
              @pointerdown="startDrag($event, widget)"
              @pointermove="moveDrag"
              @pointerup="endDrag"
              @pointercancel="endDrag"
              @lostpointercapture="endDrag"
            >
              <span v-if="selectedId === widget.id" class="selection-label"
                >{{ widget.label }} <LockKeyhole v-if="widget.locked" :size="9"
              /></span>
              <template v-if="widget.kind === 'speed'"
                ><div class="speed-heading">
                  <Gauge :size="15" /><span>SPEED</span
                  ><span
                    class="widget-live-dot"
                    :class="{ offline: !sample }"
                  ></span>
                </div>
                <div class="speed-reading">
                  <strong>{{
                    sample ? (sample.speedMps * 3.6).toFixed(1) : "—"
                  }}</strong
                  ><span>km/h</span>
                </div>
                <div class="speed-meter">
                  <i
                    v-for="i in 24"
                    :key="i"
                    :class="{
                      lit:
                        sample &&
                        i <= Math.min(24, ((sample.speedMps * 3.6) / 60) * 24),
                    }"
                  ></i></div
              ></template>
              <template v-else
                ><div class="coordinate-icon"><Crosshair :size="20" /></div>
                <div class="coordinate-readings">
                  <div>
                    <span>LAT</span
                    ><strong>{{
                      formatCoordinate(sample?.latitude, "lat")
                    }}</strong>
                  </div>
                  <div>
                    <span>LON</span
                    ><strong>{{
                      formatCoordinate(sample?.longitude, "lon")
                    }}</strong>
                  </div>
                </div></template
              >
              <template v-if="selectedId === widget.id && !widget.locked"
                ><i class="selection-corner tl"></i
                ><i class="selection-corner tr"></i
                ><i class="selection-corner bl"></i
                ><button
                  class="resize-handle"
                  :aria-label="`缩放${widget.label}`"
                  @pointerdown.stop="startDrag($event, widget, 'resize')"
                ></button
              ></template>
            </div>
            <div v-if="dropActive" class="drop-target">
              <Upload :size="30" /><strong>松开以导入素材</strong
              ><span>GPX 轨迹 / 预览视频</span>
            </div>
          </div>
          <div class="canvas-caption">
            <span
              ><span class="status-dot" :class="{ connected: sample }"></span
              >{{ status }}</span
            ><span v-if="stageSize.width"
              >{{ Math.round(stageSize.width) }} ×
              {{ Math.round(stageSize.height) }}
              <span class="caption-separator">·</span> 预览尺寸</span
            >
          </div>
        </div>

        <div class="transport-panel">
          <div class="transport-top">
            <div class="transport-buttons">
              <button
                class="icon-button"
                aria-label="回到起点"
                :disabled="!duration"
                @click="seek(0)"
              >
                <SkipBack :size="17" /></button
              ><button
                class="play-button"
                :aria-label="playing ? '暂停' : '播放'"
                :disabled="!asset"
                @click="togglePlay"
              >
                <Pause v-if="playing" :size="17" fill="currentColor" /><Play
                  v-else
                  :size="17"
                  fill="currentColor"
                />
              </button>
              <div class="playback-time">
                <strong>{{ formatTime(currentTime) }}</strong
                ><span>/ {{ formatTime(duration) }}</span>
              </div>
            </div>
            <div class="transport-meta">
              <span v-if="asset && alignmentKnown" class="sync-meta"
                ><Link2 :size="13" /> {{ offsetLabel }}</span
              ><button
                class="icon-button"
                :aria-label="muted ? '取消静音' : '静音'"
                :disabled="!asset"
                @click="muted = !muted"
              >
                <VolumeX v-if="muted" :size="17" /><Volume2 v-else :size="17" />
              </button>
            </div>
          </div>
          <div class="timeline">
            <div class="timeline-ticks">
              <span v-for="(tickLabel, index) in timelineTicks" :key="index">{{
                tickLabel
              }}</span>
            </div>
            <div class="timeline-rail">
              <div class="timeline-background"></div>
              <div v-if="coverage" class="timeline-gpx" :style="coverage"></div>
              <div
                class="timeline-progress"
                :style="{
                  width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                }"
              ></div>
              <input
                aria-label="播放进度"
                data-testid="timeline"
                type="range"
                min="0"
                :max="duration || 1"
                step="0.01"
                :value="currentTime"
                :disabled="!duration"
                @input="seek(Number(($event.target as HTMLInputElement).value))"
              />
            </div>
            <div class="timeline-legend">
              <span><i></i> GPX 覆盖范围</span
              ><span>{{
                absoluteTime && sample
                  ? dateText(absoluteTime)
                  : "等待有效轨迹时间"
              }}</span>
            </div>
          </div>
        </div>
        <footer class="workspace-footer">
          <span
            ><MousePointer2 :size="12" /> 拖动排布
            <span class="footer-separator">/</span> 方向键微调
            <span class="footer-separator">/</span> <kbd>Space</kbd> 播放 /
            暂停</span
          ><span><span class="tiny-dot"></span> 仅预览 · 不合成视频</span>
        </footer>
      </section>
    </main>
  </div>
</template>
