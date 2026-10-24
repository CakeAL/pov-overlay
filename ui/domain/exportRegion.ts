import type { Widget } from "./types";
import { widgetDimensions } from "./widgetGeometry";
export interface FrameRegion { x: number; y: number; width: number; height: number }
/** Only transmit the occupied rectangle; encoding restores the full transparent/green canvas. */
export function exportRegion(width: number, height: number, ratio: number, widgets: Widget[]): FrameRegion {
  const designHeight = 1000 / ratio;
  const scale = Math.min(width / 1000, height / designHeight);
  const originX = (width - 1000 * scale) / 2, originY = (height - designHeight * scale) / 2;
  let left = width, top = height, right = 0, bottom = 0;
  for (const widget of widgets.filter(widget => widget.visible)) {
    const size = widgetDimensions(widget, ratio);
    const x = originX + widget.x * 1000 * scale, y = originY + widget.y * designHeight * scale;
    left = Math.min(left, x - 2); top = Math.min(top, y - 2);
    right = Math.max(right, x + size.width * 1000 * scale + 2);
    bottom = Math.max(bottom, y + size.height * designHeight * scale + 2);
  }
  const x = Math.max(0, Math.min(width - 2, Math.floor(left / 2) * 2));
  const y = Math.max(0, Math.min(height - 2, Math.floor(top / 2) * 2));
  const endX = Math.max(x + 2, Math.min(width, Math.ceil(right / 2) * 2));
  const endY = Math.max(y + 2, Math.min(height, Math.ceil(bottom / 2) * 2));
  return { x, y, width: endX - x, height: endY - y };
}
