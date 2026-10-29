import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { native } from "./media";
import { sanitizeSvg } from "./svg";
export async function saveSvg(source: string, name: string): Promise<boolean> {
  const clean = new DOMParser().parseFromString(
    sanitizeSvg(source).source,
    "image/svg+xml",
  );
  const original = new DOMParser().parseFromString(
    source,
    "image/svg+xml",
  ).documentElement;
  for (const dimension of ["width", "height"]) {
    const value = Number(original.getAttribute(dimension));
    if (Number.isFinite(value) && value > 0)
      clean.documentElement.setAttribute(dimension, String(value));
  }
  const content = new XMLSerializer().serializeToString(clean.documentElement);
  const filename = `${name.replace(/[\\/:*?"<>|]/g, "_") || "道路交通牌"}.svg`;
  if (native) {
    const path = await save({
      defaultPath: filename,
      filters: [{ name: "SVG 图片", extensions: ["svg"] }],
    });
    if (!path) return false;
    await invoke("write_svg", { path, content });
  } else {
    const url = URL.createObjectURL(
      new Blob([content], { type: "image/svg+xml" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return true;
}
