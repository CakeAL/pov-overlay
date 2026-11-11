import { roadInfoHeight } from "./roadInfoOverlay";
import type { Widget } from "./types";
import { textOverlayAspect } from "./textOverlay";
export function widgetAspect(widget: Widget): number {
  if (widget.kind === 'svg' && widget.svg?.roadInfo?.mode === 'badge') return 2;
  if (widget.kind === 'svg' && widget.svg?.roadInfo) return 720 / roadInfoHeight(widget);
  if (widget.kind === 'svg' && widget.svg?.textTemplate != null)
    return textOverlayAspect(widget.svg.textTemplate, widget.typography?.fontSize, widget.svg.lineFontSizes);
  return widget.svg?.aspectRatio ?? ((widget.kind === "route" || widget.kind === "minimap") ? 1 : widget.kind === "speed" ? 1.55 : 3.35);
}
export function widgetMaximumScale(widget: Widget, canvasRatio: number): number {
  const base = widget.widthRatio ?? (widget.kind === "speed" ? 0.19 : 0.3);
  return Math.min(1 / base, widgetAspect(widget) / (base * canvasRatio));
}
export function widgetDimensions(widget: Widget, canvasRatio: number) {
  const width = (widget.widthRatio ?? (widget.kind === "speed" ? 0.19 : 0.3)) * widget.scale;
  const height = width * canvasRatio / widgetAspect(widget);
  const fit = Math.min(1, 1 / width, 1 / height);
  return { width: width * fit, height: height * fit };
}

export interface ContentRect { x: number; y: number; width: number; height: number }

/** Match CSS `object-fit: contain` when rasterizing a widget into its box. */
export function containRect(
  aspect: number,
  width: number,
  height: number,
): ContentRect {
  if (
    !Number.isFinite(aspect) ||
    aspect <= 0 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    return { x: 0, y: 0, width, height };
  if (aspect >= width / height) {
    const containedHeight = width / aspect;
    return {
      x: 0,
      y: (height - containedHeight) / 2,
      width,
      height: containedHeight,
    };
  }
  const containedWidth = height * aspect;
  return {
    x: (width - containedWidth) / 2,
    y: 0,
    width: containedWidth,
    height,
  };
}

/** Read the intrinsic aspect from the root SVG viewBox, falling back to pixels. */
export function svgAspect(source: string): number | null {
  const tag = source.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const viewBox = tag.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1];
  if (viewBox) {
    const values = viewBox.trim().split(/[\s,]+/).map(Number);
    if (
      values.length === 4 &&
      values.every(Number.isFinite) &&
      values[2]! > 0 &&
      values[3]! > 0
    )
      return values[2]! / values[3]!;
  }
  const width = tag.match(/\bwidth\s*=\s*["']([\d.]+)(?:px)?["']/i)?.[1],
    height = tag.match(/\bheight\s*=\s*["']([\d.]+)(?:px)?["']/i)?.[1];
  if (width && height) {
    const aspect = Number(width) / Number(height);
    if (Number.isFinite(aspect) && aspect > 0) return aspect;
  }
  return null;
}
