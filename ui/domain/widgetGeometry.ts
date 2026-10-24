import type { Widget } from "./types";
export function widgetAspect(widget: Widget): number {
  return widget.svg?.aspectRatio ?? ((widget.kind === "route" || widget.kind === "minimap") ? 1 : widget.kind === "speed" ? 1.55 : 3.35);
}
export function widgetDimensions(widget: Widget, canvasRatio: number) {
  const width = (widget.widthRatio ?? (widget.kind === "speed" ? 0.19 : 0.3)) * widget.scale;
  const height = width * canvasRatio / widgetAspect(widget);
  const fit = Math.min(1, 1 / width, 1 / height);
  return { width: width * fit, height: height * fit };
}
