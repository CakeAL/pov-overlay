import { computed, ref, watch, type Ref } from "vue";
import { defaultWidgets, type Widget } from "../domain/types";

export function useWidgetLayout(
  ratio: Ref<number>,
  stage: Ref<HTMLElement | undefined>,
) {
  const widgets = ref<Widget[]>(defaultWidgets()),
    selectedId = ref("speed");
  const selected = computed(() =>
    widgets.value.find((widget) => widget.id === selectedId.value),
  );
  const snapEnabled = ref(true),
    showSafeArea = ref(true),
    guides = ref({ x: false, y: false });
  const undoStack = ref<string[]>([]),
    redoStack = ref<string[]>([]);
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
        Math.min(
          1.65,
          drag.scale + dx / (widget.kind === "speed" ? 0.19 : 0.3),
        ),
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

  function resetSelected() {
    if (!selected.value) return;
    remember();
    Object.assign(
      selected.value,
      defaultWidgets().find((widget) => widget.id === selected.value!.id),
    );
  }
  function toggleLock(widget: Widget) {
    remember();
    widget.locked = !widget.locked;
  }
  function updatePosition(axis: "x" | "y", event: Event) {
    if (!selected.value || selected.value.locked) return;
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      selected.value[axis] = value / 100;
      clampWidget(selected.value);
    }
  }
  watch(ratio, clampAll);
  return {
    widgets,
    selectedId,
    selected,
    snapEnabled,
    showSafeArea,
    guides,
    undoStack,
    redoStack,
    remember,
    undo,
    redo,
    resetLayout,
    resetSelected,
    toggleVisible,
    toggleLock,
    updatePosition,
    updateScale,
    clampWidget,
    widgetStyle,
    startDrag,
    moveDrag,
    endDrag,
  };
}
export type WidgetLayout = ReturnType<typeof useWidgetLayout>;
