import { styleWidgetSvg } from "./widgetTypography";
import type { Sample, Widget } from "./types";
import { formatCoordinate } from "./telemetry";
import { bindSvg } from "./svgBindings";
import { widgetAspect, widgetDimensions } from "./widgetGeometry";
export const svgDataUrl = (source: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
export function widgetSvg(widget: Widget, sample: Sample | null, elapsed: number, ratio: number): string {
  if (widget.kind === "svg")
    return styleWidgetSvg(bindSvg(widget.svg?.source ?? "", sample, elapsed, widget.color), widget.typography);
  const width = widgetDimensions(widget, ratio).width * 1000;
  const height = width / widgetAspect(widget);
  const s = widget.scale;
  const color = /^#[0-9a-f]{6}$/i.test(widget.color) ? widget.color : "#ffffff";
  const hasSpeed = sample != null && sample.speedValid !== false;
  let body: string;
  if (widget.kind === "speed") {
    const speed = hasSpeed ? sample!.speedMps * 3.6 : null;
    const bars = Array.from({ length: 24 }, (_, index) => {
      const x = 15 * s + index * (width - 30 * s) / 24;
      const lit = speed != null && index + 1 <= Math.min(24, speed / 60 * 24);
      return `<rect x="${x}" y="${height - 20 * s}" width="${(width - 30 * s) / 24 - 1.9 * s}" height="${6 * s}" rx="${s}" fill="${lit ? color : "#52604966"}"/>`;
    }).join("");
    body = `<g transform="translate(${15 * s} ${14 * s}) scale(${s})" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"><path d="M2 13a7 7 0 1 1 12 0M8 9l4-4"/></g>
      <text x="${37 * s}" y="${25 * s}" font-size="${9 * s}" letter-spacing="${1.3 * s}" fill="${color}">SPEED</text>
      <circle cx="${width - 17 * s}" cy="${20 * s}" r="${2 * s}" fill="${hasSpeed ? color : "#7c8973"}"/>
      <text x="${15 * s}" y="${height - 35 * s}" font-size="${50 * s}" font-weight="550" letter-spacing="${-2.5 * s}">${speed == null ? "—" : speed.toFixed(1)}<tspan dx="${5 * s}" font-size="${9.5 * s}" font-weight="400" letter-spacing="0" fill="#b2bda9">km/h</tspan></text>${bars}`;
  } else {
    const center = height / 2;
    body = `<g transform="translate(${29.5 * s} ${center})" fill="none" stroke="${color}" stroke-width="${1.5 * s}"><circle r="${15.5 * s}" stroke-opacity=".2"/><circle r="${7 * s}"/><path d="M${-10 * s} 0h${5 * s}M${5 * s} 0h${5 * s}M0 ${-10 * s}v${5 * s}M0 ${5 * s}v${5 * s}"/></g>
      <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${13.5 * s}">
        <text x="${57 * s}" y="${center - 7 * s}" font-size="${8 * s}" fill="${color}">LAT</text>
        <text x="${57 * s}" y="${center + 15 * s}" font-size="${8 * s}" fill="${color}">LON</text>
        <text x="${86 * s}" y="${center - 7 * s}">${formatCoordinate(sample?.latitude, "lat")}</text>
        <text x="${86 * s}" y="${center + 15 * s}">${formatCoordinate(sample?.longitude, "lon")}</text>
      </g>`;
  }
  return styleWidgetSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" fill="white" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif">${body}</svg>`, widget.typography);
}
