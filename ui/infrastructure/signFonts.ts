import type {
  SignArtwork,
  SignTextItem,
  TextBox,
} from "../domain/signs/textLayout";
import type { Font, Path } from "opentype.js";
import { invoke } from "@tauri-apps/api/core";
import { native } from "./media";
let pending: Promise<Font[]> | undefined;
export function loadSignFonts() {
  if (!pending)
    pending = Promise.all(
      ["A", "B", "C"].map(async (kind) => {
        const buffer = native
          ? new Uint8Array(await invoke<number[]>("load_sign_font", { kind }))
              .buffer
          : await (async () => {
              const r = await fetch(`/fonts/jtbz_${kind}.ttf`);
              if (!r.ok) throw new Error("交通标志字体加载失败。");
              return r.arrayBuffer();
            })();
        const { parse } = await import("opentype.js");
        return parse(buffer);
      }),
    ).catch((e) => {
      pending = undefined;
      throw e;
    });
  return pending;
}
function data(path: Path) {
  return path.commands
    .map((c) => {
      const v =
        c.type === "Z"
          ? []
          : c.type === "C"
            ? [c.x1, c.y1, c.x2, c.y2, c.x, c.y]
            : c.type === "Q"
              ? [c.x1, c.y1, c.x, c.y]
              : [c.x, c.y];
      if (v.some((x) => !Number.isFinite(x))) throw new Error("字体轮廓无效。");
      return c.type + v.map((x) => Number(x.toFixed(3))).join(" ");
    })
    .join("");
}
export async function outlineSignArtwork(
  source: string,
  style?: "B" | "C",
): Promise<SignArtwork> {
  const fonts = await loadSignFonts();
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  function plan(node: Element) {
    const [x, y, w, h] = node
      .getAttribute("data-letter-box")!
      .split(" ")
      .map(Number) as [number, number, number, number];
    const value = node.textContent ?? "",
      justify = Number(node.getAttribute("data-gap")) < 0;
    const fontRole = node.getAttribute("data-sign-font") ?? "A";
    const isCode = fontRole !== "A";
    const glyphs = [...value].map((char) => {
      const role = /[^\x00-\xff]/.test(char)
        ? "A"
        : isCode && style
          ? style
          : fontRole;
      const f = fonts[role === "C" ? 2 : role === "B" ? 1 : 0]!;
      if (!f.hasChar(char) && char.trim())
        throw new Error(`交通标志字体缺少“${char}”字形。`);
      const path = f.getPath(char, 0, 0, f.unitsPerEm),
        box = path.getBoundingBox();
      const height = box.y2 - box.y1;
      const scale = height > 0 ? h / height : 0;
      return {
        path,
        box,
        top: box.y1,
        scale,
        width: char === " " ? h * 0.4 : (box.x2 - box.x1) * scale,
      };
    });
    if (!isCode) {
      const visible = glyphs.filter((g) => g.scale > 0);
      const top = Math.min(...visible.map((g) => g.box.y1));
      const bottom = Math.max(...visible.map((g) => g.box.y2));
      if (bottom > top)
        glyphs.forEach((g) => {
          g.top = top;
          g.scale = g.scale ? h / (bottom - top) : 0;
          g.width = g.scale ? (g.box.x2 - g.box.x1) * g.scale : h * 0.4;
        });
    }
    let used = glyphs.reduce((s, g) => s + g.width, 0);
    const gapCount = Math.max(0, glyphs.length - 1),
      maxGap = Math.max(0, Number(node.getAttribute("data-gap")) || 0);
    let gap = gapCount
      ? justify
        ? (w - used) / gapCount
        : Math.min(maxGap, (w - used) / gapCount)
      : 0;
    if (gap < 0) {
      const ratio = w / used;
      glyphs.forEach((g) => {
        g.scale *= ratio;
        g.width *= ratio;
      });
      used = w;
      gap = 0;
    }
    const width = used + gapCount * gap;
    return { node, x, y, w, h, glyphs, gap, width };
  }
  const plans = [...doc.querySelectorAll("text")].map(plan);
  for (const cluster of doc.querySelectorAll("[data-number-cluster]")) {
    const children = plans.filter((p) => p.node.parentElement === cluster),
      width = Number(cluster.getAttribute("data-number-cluster")),
      gap = Number(cluster.getAttribute("data-cluster-gap")),
      y = Number(cluster.getAttribute("data-cluster-y"));
    let left =
      (width -
        children.reduce((s, p) => s + p.width, 0) -
        gap * Math.max(0, children.length - 1)) /
      2;
    children.forEach((p) => {
      p.x = left;
      p.y += y;
      p.w = p.width;
      left += p.width + gap;
    });
    for (const a of [...cluster.attributes]) cluster.removeAttribute(a.name);
  }
  const texts: SignTextItem[] = [];
  for (const [index, p] of plans.entries()) {
    const group = doc.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("data-sign-text", "true");
    const key = p.node.getAttribute("data-sign-key") ?? `text-${index}`;
    group.setAttribute("data-sign-key", key);
    group.setAttribute(
      "data-sign-font",
      p.node.getAttribute("data-sign-font") ?? "A",
    );
    group.setAttribute("aria-label", p.node.textContent ?? "");
    group.setAttribute("fill", p.node.getAttribute("fill") ?? "white");
    const align = p.node.getAttribute("data-align");
    let x =
      p.x +
      (align === "start"
        ? 0
        : align === "end"
          ? p.w - p.width
          : (p.w - p.width) / 2);
    const glyphBounds: TextBox[] = [];
    for (const g of p.glyphs) {
      if (g.scale) {
        const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", data(g.path));
        path.setAttribute(
          "transform",
          `translate(${x - g.box.x1 * g.scale} ${p.y - g.top * g.scale}) scale(${g.scale})`,
        );
        glyphBounds.push({
          x,
          y: p.y + (g.box.y1 - g.top) * g.scale,
          width: g.width,
          height: (g.box.y2 - g.box.y1) * g.scale,
        });
        group.append(path);
      }
      x += g.width + p.gap;
    }
    if (glyphBounds.length) {
      const left = Math.min(...glyphBounds.map((b) => b.x)),
        top = Math.min(...glyphBounds.map((b) => b.y));
      const local = {
        x: left,
        y: top,
        width: Math.max(...glyphBounds.map((b) => b.x + b.width)) - left,
        height: Math.max(...glyphBounds.map((b) => b.y + b.height)) - top,
      };
      let svg: Element = p.node.closest("svg")!,
        frame = { x: 0, y: 0, scale: 1 };
      while (svg !== doc.documentElement) {
        const [vx, vy, vw, vh] = svg
          .getAttribute("viewBox")!
          .split(/\s+/)
          .map(Number);
        const width = Number(svg.getAttribute("width")),
          height = Number(svg.getAttribute("height"));
        const scale = Math.min(width / vw!, height / vh!);
        frame = {
          x:
            Number(svg.getAttribute("x") ?? 0) +
            (width - vw! * scale) / 2 -
            vx! * scale +
            frame.x * scale,
          y:
            Number(svg.getAttribute("y") ?? 0) +
            (height - vh! * scale) / 2 -
            vy! * scale +
            frame.y * scale,
          scale: frame.scale * scale,
        };
        svg = svg.parentElement!.closest("svg")!;
      }
      const base = {
        x: frame.x + local.x * frame.scale,
        y: frame.y + local.y * frame.scale,
        width: local.width * frame.scale,
        height: local.height * frame.scale,
      };
      texts.push({
        key,
        label: p.node.textContent ?? "",
        base,
        bounds: { ...base },
        frame,
        local,
      });
    }
    p.node.replaceWith(group);
  }
  const view = doc.documentElement
    .getAttribute("viewBox")!
    .split(/\s+/)
    .map(Number);
  return {
    source: new XMLSerializer().serializeToString(doc.documentElement),
    texts,
    width: view[2]!,
    height: view[3]!,
  };
}

export async function outlineSign(source: string, style?: "B" | "C") {
  return (await outlineSignArtwork(source, style)).source;
}
