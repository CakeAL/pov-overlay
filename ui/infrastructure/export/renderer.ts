import type { ExportBackground } from "../../domain/exportSettings";
import type { Sample, Widget } from "../../domain/types";
import { widgetDimensions } from "../../domain/widgetGeometry";
import { svgDataUrl, widgetSvg } from "../../domain/widgetSvg";
function image(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画布元素无法渲染，请检查 SVG。"));
    img.src = svgDataUrl(source);
  });
}
/** Isolated SVG images avoid ID collisions, foreignObject and DOM screenshot dependencies. */
export class ExportRenderer {
  private canvas = document.createElement("canvas");
  private context: CanvasRenderingContext2D;
  private cache = new Map<string, { source: string; image: HTMLImageElement }>();
  private previousKey = "";
  private previousPng: Uint8Array | null = null;
  constructor(private width: number, private height: number, private ratio: number, private widgets: Widget[], private background: ExportBackground = "transparent") {
    this.canvas.width = width;
    this.canvas.height = height;
    const context = this.canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("当前系统无法创建导出画布。");
    this.context = context;
  }
  async frame(sample: Sample | null, elapsed: number): Promise<Uint8Array> {
    const visible = this.widgets.filter(widget => widget.visible);
    const sources = visible.map(widget => widgetSvg(widget, sample, elapsed, this.ratio));
    const key = JSON.stringify(sources);
    if (key === this.previousKey && this.previousPng) return this.previousPng;
    const images = await Promise.all(visible.map(async (widget, i) => {
      const cached = this.cache.get(widget.id);
      if (cached?.source === sources[i]) return cached.image;
      const result = await image(sources[i]!);
      this.cache.set(widget.id, { source: sources[i]!, image: result });
      return result;
    }));
    const ctx = this.context;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.background === "green") {
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(0, 0, this.width, this.height);
    }
    const designWidth = 1000, designHeight = 1000 / this.ratio;
    const scale = Math.min(this.width / designWidth, this.height / designHeight);
    ctx.setTransform(scale, 0, 0, scale, (this.width - designWidth * scale) / 2, (this.height - designHeight * scale) / 2);
    visible.forEach((widget, i) => {
      const size = widgetDimensions(widget, this.ratio);
      const x = widget.x * designWidth, y = widget.y * designHeight;
      const width = size.width * designWidth, height = size.height * designHeight;
      if (widget.opacity > 0) {
        ctx.fillStyle = `rgba(23,31,25,${widget.opacity / 100})`;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 7 * widget.scale);
        ctx.fill();
      }
      ctx.drawImage(images[i]!, x, y, width, height);
    });
    const blob = await new Promise<Blob>((resolve, reject) => this.canvas.toBlob(
      value => value ? resolve(value) : reject(new Error("无法生成导出帧。")), "image/png",
    ));
    this.previousKey = key;
    this.previousPng = new Uint8Array(await blob.arrayBuffer());
    return this.previousPng;
  }
  dispose() {
    this.cache.clear();
    this.previousPng = null;
    this.canvas.width = this.canvas.height = 0;
  }
}
