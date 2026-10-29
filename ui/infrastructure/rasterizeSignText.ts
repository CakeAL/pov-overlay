import { svgDataUrl } from "../domain/widgetSvg";
/** Keep sign geometry vector; flatten only the explicitly marked lettering into one transparent PNG. */
export async function rasterizeSignText(source: string) {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml"),
    root = doc.documentElement;
  const width = Number(root.getAttribute("width")),
    height = Number(root.getAttribute("height"));
  if (!Number.isFinite(width * height) || width * height > 33_177_600)
    throw new Error("文字栅格化最多支持 8K 像素总量，请减小输出宽度。");
  const text = doc.cloneNode(true) as Document;
  function prune(node: Element) {
    if (node.hasAttribute("data-sign-text")) return;
    for (const child of [...node.children]) {
      if (
        child.querySelector("[data-sign-text]") ||
        child.hasAttribute("data-sign-text")
      )
        prune(child);
      else child.remove();
    }
  }
  prune(text.documentElement);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("文字栅格化失败。"));
    image.src = svgDataUrl(
      new XMLSerializer().serializeToString(text.documentElement),
    );
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建栅格化画布。");
  ctx.drawImage(image, 0, 0, width, height);
  root.querySelectorAll("[data-sign-text]").forEach((n) => n.remove());
  const png = doc.createElementNS("http://www.w3.org/2000/svg", "image");
  png.setAttribute("width", String(width));
  png.setAttribute("height", String(height));
  const view = root
    .getAttribute("viewBox")!
    .split(/[\s,]+/)
    .map(Number);
  png.setAttribute("width", String(view[2]));
  png.setAttribute("height", String(view[3]));
  png.setAttribute("href", canvas.toDataURL("image/png"));
  root.append(png);
  canvas.width = canvas.height = 0;
  return new XMLSerializer().serializeToString(root);
}
