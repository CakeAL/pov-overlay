import { widgetAspect, widgetDimensions, widgetMaximumScale } from "../domain/widgetGeometry";
import { computed, ref, watch, type Ref } from "vue";
import { defaultWidgets, type Widget } from "../domain/types";
import { snapLayout, type SnapGuides } from "../domain/layoutSnapping";

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
    guides = ref<SnapGuides>({ x: null, y: null });
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
  const maximumScale = computed(() => selected.value ? widgetMaximumScale(selected.value, ratio.value) : 1);
  const dimensions = (widget: Widget) => widgetDimensions(widget, ratio.value);
  function clampWidget(widget: Widget) {
    widget.scale = Math.max(0, Math.min(widgetMaximumScale(widget, ratio.value), widget.scale));
    const size = dimensions(widget);
    widget.x = Math.max(0, Math.min(1 - size.width, widget.x));
    widget.y = Math.max(0, Math.min(1 - size.height, widget.y));
  }
  function clampAll() {
    widgets.value.forEach(clampWidget);
  }
  function updateScale(event: Event) {
    setScale(Number((event.target as HTMLInputElement).value));
  }
  function setScale(value: number) {
    if (!selected.value || selected.value.locked || !Number.isFinite(value)) return;
    selected.value.scale = value;
    clampWidget(selected.value);
  }
  function widgetStyle(widget: Widget) {
    const size = dimensions(widget);
    return {
      left: `${widget.x * 100}%`,
      top: `${widget.y * 100}%`,
      width: `${size.width * 100}%`,
      aspectRatio: String(widgetAspect(widget)),
      backdropFilter: widget.opacity > 0 ? "blur(8px)" : "none",
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
    (event.currentTarget as HTMLElement).focus({ preventScroll: true });
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
    guides.value = { x: null, y: null };
    if (drag.mode === "resize")
      widget.scale = Math.max(
        0,
        Math.min(
          widgetMaximumScale(widget, ratio.value),
          drag.scale +
            dx / (widget.widthRatio ?? (widget.kind === "speed" ? 0.19 : 0.3)),
        ),
      );
    else {
      widget.x = drag.x + dx;
      widget.y = drag.y + dy;
      if (snapEnabled.value && !event.altKey) {
        const result = snapLayout(
          { x: widget.x, y: widget.y, ...dimensions(widget) },
          widgets.value
            .filter((other) => other.id !== widget.id && other.visible && other.scale > 0)
            .map((other) => ({ x: other.x, y: other.y, ...dimensions(other) })),
          drag.rect,
          showSafeArea.value,
        );
        widget.x = result.x;
        widget.y = result.y;
        guides.value = result.guides;
      }
    }
    clampWidget(widget);
  }
  function endDrag() {
    drag = null;
    guides.value = { x: null, y: null };
  }
  function removeWidget(id: string) {
    const index = widgets.value.findIndex(widget => widget.id === id);
    if (index < 0) return;
    remember();
    widgets.value.splice(index, 1);
    if (selectedId.value === id) selectedId.value = widgets.value[Math.min(index, widgets.value.length - 1)]?.id ?? "";
  }
  function toggleVisible(widget: Widget) {
    remember();
    widget.visible = !widget.visible;
  }

  function resetSelected() {
    if (!selected.value) return;
    remember();
    delete selected.value.typography;
    Object.assign(
      selected.value,
      defaultWidgets().find((widget) => widget.id === selected.value!.id) ?? {
        x: 0.05,
        y: 0.05,
        scale: 1,
        opacity: 0,
        color: "#ffffff",
      },
    );
  }
  function toggleLock(widget: Widget) {
    remember();
    widget.locked = !widget.locked;
  }
  function updatePosition(axis: "x" | "y", event: Event | number) {
    if (!selected.value || selected.value.locked) return;
    const value = typeof event === 'number' ? event : Number((event.target as HTMLInputElement).value);
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
    removeWidget,
    toggleLock,
    updatePosition,
    updateScale,
    clampWidget,
    dimensions,
    maximumScale, setScale,
    widgetStyle,
    startDrag,
    moveDrag,
    endDrag,
  };
}
export type WidgetLayout = ReturnType<typeof useWidgetLayout>;
