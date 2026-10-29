// @vitest-environment jsdom
import { readFile } from "node:fs/promises";
import { expect, test, vi, afterEach } from "vitest";
import {
  newSignDesign,
  SIGN_TEMPLATES,
  validateSign,
} from "../domain/signs/model";
import { renderSign } from "../domain/signs/render";
import { outlineSign } from "../infrastructure/signFonts";
import { sanitizeSvg } from "../infrastructure/svg";
vi.mock("../infrastructure/media", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../infrastructure/media")>()),
  native: false,
}));
afterEach(() => vi.unstubAllGlobals());
function fonts() {
  vi.stubGlobal("fetch", async (url: string) => {
    const file = await readFile(`src-tauri/resources${url}`);
    return {
      ok: true,
      arrayBuffer: async () =>
        file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    };
  });
}
test("all templates generate isolated SVGs and use the supplied fonts as portable glyph paths", async () => {
  fonts();
  const d = newSignDesign();
  d.code = "318";
  d.province = "苏";
  d.roadName = "南京路";
  d.english = "NANJING LU";
  d.exitNumber = "12";
  d.destinations = [
    { name: "南京", english: "Nanjing", distance: "12.5", direction: "right" },
  ];
  for (const template of SIGN_TEMPLATES) {
    d.template = template.value;
    validateSign(d);
    const { source, width, height } = renderSign(d);
    const output = await outlineSign(source);
    const doc = new DOMParser().parseFromString(output, "image/svg+xml");
    expect(
      doc.querySelector("parsererror, text, image, script, foreignObject"),
    ).toBeNull();
    expect(doc.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(output).not.toMatch(/(?:NaN|Infinity)/);
    expect(doc.documentElement.getAttribute("width")).toBe(String(width));
    expect(doc.documentElement.getAttribute("height")).toBe(String(height));
    expect(sanitizeSvg(output).source).toContain("<path");
  }
});
test("content is escaped and invalid numbers, rows and output bounds are rejected", async () => {
  fonts();
  const d = newSignDesign();
  d.template = "roadName";
  d.roadName = '<script>&"';
  const { source } = renderSign(d);
  expect(
    new DOMParser()
      .parseFromString(source, "image/svg+xml")
      .querySelector("script"),
  ).toBeNull();
  expect(source).toContain("&lt;script&gt;");
  d.template = "national";
  d.code = "12";
  expect(() => validateSign(d)).toThrow();
  d.code = "318";
  validateSign(d);
  d.outputWidth = Infinity;
  expect(() => renderSign(d)).toThrow();
  d.outputWidth = 1200;
  d.destinations = [];
  expect(() => renderSign(d)).toThrow();
});
test("B and C fonts produce different outlines and unsupported glyphs are reported", async () => {
  fonts();
  const d = newSignDesign();
  d.code = "42";
  const { source } = renderSign(d);
  expect(await outlineSign(source, "B")).not.toEqual(
    await outlineSign(source, "C"),
  );
  d.template = "roadName";
  d.roadName = "🚲";
  await expect(outlineSign(renderSign(d).source)).rejects.toThrow("缺少");
});

test("the Hikari sign page isolates editor shortcuts and keeps the draft without adding canvas elements", async () => {
  fonts();
  const { createApp, h, nextTick } = await import("vue");
  const { provideEditor } = await import("../editor/context");
  const { default: SignMakerPage } = await import(
    "../components/signs/SignMakerPage.vue"
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  let editor!: ReturnType<typeof provideEditor>;
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup() {
      editor = provideEditor();
      return () => h(SignMakerPage);
    },
  });
  app.mount(host);
  try {
    const before = editor.layout.widgets.length,
      x = editor.layout.selected!.x;
    editor.signMaker.open();
    expect(editor.signMaker.items.length).toBeGreaterThan(10);
    expect(host.textContent).not.toContain("国标示例");
    expect(host.textContent).not.toContain("文字栅格化");
    const green = host.querySelector<HTMLElement>(".hk-tag-success")!;
    expect(green.textContent).toBe("高速");
    expect(green.style.getPropertyValue("--hi-color-success")).toBe("#166534");
    expect(host.querySelector(".hk-tag-danger")?.textContent).toBe("国道");
    editor.signMaker.add("nationalExpressway");
    editor.signMaker.design!.code = "42";
    editor.signMaker.design!.roadName = "沪蓉高速";
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
      await nextTick();
    }
    expect(editor.signMaker.error).toBe("");
    expect(host.querySelector("img")?.getAttribute("src")).toContain(
      "data:image/svg+xml",
    );
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(editor.layout.selected!.x).toBe(x);
    expect(
      [...host.querySelectorAll<HTMLButtonElement>("button")].some(
        (b) => b.textContent === "加入画布",
      ),
    ).toBe(false);
    editor.signMaker.pageOpen = false;
    editor.signMaker.open();
    expect(editor.signMaker.design!.code).toBe("42");
    expect(editor.layout.widgets).toHaveLength(before);
  } finally {
    app.unmount();
    host.remove();
  }
});

test("SVG download preserves numeric output dimensions after sanitization", async () => {
  const { Blob } = await import("node:buffer");
  vi.stubGlobal("Blob", Blob);
  let saved!: Blob;
  vi.stubGlobal("URL", {
    createObjectURL: (blob: Blob) => {
      saved = blob;
      return "blob:test";
    },
    revokeObjectURL: vi.fn(),
  });
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  try {
    const { saveSvg } = await import("../infrastructure/saveSvg");
    await saveSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><script>attack()</script><path d="M0 0L1 1"/></svg>',
      "标牌",
    );
    const content = await saved.text();
    expect(content).toContain('width="1200"');
    expect(content).toContain('height="600"');
    expect(content).not.toContain("<script");
  } finally {
    click.mockRestore();
  }
});

test("four-digit highway signs use Appendix C panel ratio and a two-thirds-height suffix", async () => {
  fonts();
  const d = newSignDesign("provincialExpressway");
  d.code = "0421";
  d.province = "粤";
  d.roadName = "许广高速";
  const raw = renderSign(d);
  expect(raw.height).toBe(Math.round((1200 * 120) / 170));
  const output = await outlineSign(raw.source);
  const doc = new DOMParser().parseFromString(output, "image/svg+xml");
  const main = doc.querySelector('[aria-label="S04"]')!,
    suffix = doc.querySelector('[aria-label="21"]')!;
  expect(main).not.toBeNull();
  expect(suffix).not.toBeNull();
  // Actual bounds come from glyph paths: main 45 cm, suffix 30 cm in the design coordinate scale.
  const rawDoc = new DOMParser().parseFromString(raw.source, "image/svg+xml");
  const runs = [...rawDoc.querySelectorAll("text")];
  const mainHeight = Number(
    runs.find((n) => n.textContent === "S04")!.getAttribute("font-size"),
  );
  const suffixHeight = Number(
    runs.find((n) => n.textContent === "21")!.getAttribute("font-size"),
  );
  expect(suffixHeight / mainHeight).toBeCloseTo(2 / 3);
  expect(doc.querySelector('[aria-label="粤高速"]')).not.toBeNull();
  expect(doc.querySelector('[aria-label="许广高速"]')).not.toBeNull();
});

test("Appendix B assigns normal English to A and road/exit numbers to B", async () => {
  fonts();
  const d = newSignDesign("direction");
  d.destinations = [
    { name: "南京", english: "Nanjing", distance: "", direction: "straight" },
  ];
  const output = await outlineSign(renderSign(d).source);
  const doc = new DOMParser().parseFromString(output, "image/svg+xml");
  const english = doc.querySelector('[aria-label="Nanjing"]')!;
  expect(english.getAttribute("data-sign-font")).toBe("A");
  const scales = [...english.querySelectorAll("path")].map(
    (p) => p.getAttribute("transform")!.match(/scale\(([^)]+)\)/)![1],
  );
  expect(new Set(scales).size).toBe(1); // Preserve lowercase proportions and common baseline.
  d.template = "exit";
  d.exitNumber = "12";
  const exit = new DOMParser().parseFromString(
    await outlineSign(renderSign(d).source),
    "image/svg+xml",
  );
  expect(
    exit.querySelector('[aria-label="12"]')?.getAttribute("data-sign-font"),
  ).toBe("B");
  expect(
    exit.querySelector('[aria-label="出口"]')?.getAttribute("data-sign-font"),
  ).toBe("A");
});

test("named expressways preserve full names, Appendix C ratios and centered short names", async () => {
  fonts();
  for (const [code, name, w] of [
    ["3", "京台高速", 250],
    ["92", "杭州湾环线高速", 250],
    ["1522", "常台高速", 340],
  ] as const) {
    const d = { ...newSignDesign("nationalExpressway"), code, roadName: name };
    validateSign(d);
    const raw = renderSign(d);
    expect(raw.source).toContain(`viewBox="0 0 ${w} 240"`);
    const doc = new DOMParser().parseFromString(raw.source, "image/svg+xml");
    const text = [...doc.querySelectorAll("text")].find(
      (t) => t.textContent === name,
    )!;
    expect(Number(text.getAttribute("data-gap"))).toBeGreaterThan(0);
    expect(
      Number(text.getAttribute("data-letter-box")!.split(" ")[3]),
    ).toBeGreaterThanOrEqual(20);
    const outlined = await outlineSign(raw.source);
    expect(outlined).toContain(`aria-label="${name}"`);
    expect(outlined).not.toMatch(/<text|<image/);
  }
  const road = { ...newSignDesign("urbanExpressway"), roadName: "北四环" };
  const sign = renderSign(road);
  expect(sign.width / sign.height).toBeCloseTo(2.05, 1);
});

test("all default signs export finite portable paths and retain separate B/C route roles", async () => {
  fonts();
  const { SIGN_EXAMPLES } = await import("../domain/signs/examples");
  for (const example of SIGN_EXAMPLES) {
    validateSign(example.design);
    const source = renderSign(example.design).source;
    const raw = new DOMParser().parseFromString(source, "image/svg+xml");
    for (const text of raw.querySelectorAll("text")) {
      const [x, y, w, h] = text
        .getAttribute("data-letter-box")!
        .split(" ")
        .map(Number);
      const view = text
        .closest("svg")!
        .getAttribute("viewBox")!
        .split(" ")
        .map(Number);
      expect(x, example.label).toBeGreaterThanOrEqual(0);
      expect(y, example.label).toBeGreaterThanOrEqual(0);
      expect(x! + w!, example.label).toBeLessThanOrEqual(view[2]!);
      expect(y! + h!, example.label).toBeLessThanOrEqual(view[3]!);
    }
    const outlined = await outlineSign(source);
    expect(outlined, example.label).not.toMatch(/NaN|Infinity|<text|<image/);
    expect(sanitizeSvg(outlined).source).toContain("<path");
  }
  const b1 = SIGN_EXAMPLES.find((e) => e.figure === "图 B.1 b")!;
  const doc = new DOMParser().parseFromString(
    await outlineSign(renderSign(b1.design).source),
    "image/svg+xml",
  );
  expect(
    doc.querySelector('[aria-label="G329"]')?.getAttribute("data-sign-font"),
  ).toBe("C");
  expect(
    doc.querySelector('[aria-label="S226"]')?.getAttribute("data-sign-font"),
  ).toBe("C");
  expect(
    doc.querySelector('[aria-label="S206"]')?.getAttribute("data-sign-font"),
  ).toBe("B");
});

test("distance signs sort a copy, align numeric columns and space smaller km units separately", () => {
  const d = newSignDesign("distance");
  d.destinations = [
    { name: "天津", english: "", distance: "95", direction: "straight" },
    { name: "采育", english: "", distance: "14", direction: "straight" },
    { name: "廊坊", english: "", distance: "37", direction: "straight" },
  ];
  const source = renderSign(d).source;
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const texts = [...doc.querySelectorAll("text")];
  expect(
    texts
      .filter((t) => ["采育", "廊坊", "天津"].includes(t.textContent!))
      .map((t) => t.textContent),
  ).toEqual(["采育", "廊坊", "天津"]);
  expect(d.destinations[0]!.name).toBe("天津");
  const boxes = (t: Element) =>
    t.getAttribute("data-letter-box")!.split(" ").map(Number);
  const numbers = texts.filter((t) =>
      ["14", "37", "95"].includes(t.textContent!),
    ),
    units = texts.filter((t) => t.textContent === "km");
  expect(new Set(numbers.map((t) => boxes(t)[0]))).toHaveLength(1);
  units.forEach((unit, i) => {
    const n = boxes(numbers[i]!),
      u = boxes(unit);
    expect(u[3]! / n[3]!).toBe(0.5);
    expect(u[0]! - (n[0]! + n[2]!)).toBeGreaterThanOrEqual(18);
    expect(u[1]! + u[3]!).toBe(n[1]! + n[3]!);
    expect(Number(unit.getAttribute("data-gap"))).toBeGreaterThan(0);
  });
  expect(renderSign(d).width / renderSign(d).height).toBeCloseTo(1.39, 1);
});

test("roundabout supports distinct diagonal exits and never invents an unconfigured straight exit", () => {
  const d = newSignDesign("roundabout");
  d.destinations = ["left", "right", "upperLeft", "upperRight"].map(
    (direction) => ({
      name: "地点",
      english: "",
      distance: "",
      direction: direction as "left",
    }),
  );
  validateSign(d);
  const first = renderSign(d).source;
  d.destinations.push({
    name: "前方",
    english: "",
    distance: "",
    direction: "straight",
  });
  validateSign(d);
  const next = renderSign(d).source;
  const straightHead = (source: string) =>
    new DOMParser()
      .parseFromString(source, "image/svg+xml")
      .querySelector('path[transform*="rotate(0)"]');
  expect(straightHead(first)).toBeNull();
  expect(straightHead(next)).not.toBeNull();
  d.destinations[4]!.direction = "left";
  expect(() => validateSign(d)).toThrow("每个方向");
});

async function visibleGlyphBoxes(group: Element) {
  const { Path } = await import("opentype.js");
  return [...group.querySelectorAll("path")].map((node) => {
    const path = new Path();
    (
      path as typeof path & {
        fromSVG(data: string, options: { flipY: boolean }): void;
      }
    ).fromSVG(node.getAttribute("d")!, { flipY: false });
    const b = path.getBoundingBox();
    const match = /translate\(([-\d.e]+) ([-\d.e]+)\) scale\(([-\d.e]+)\)/.exec(
      node.getAttribute("transform")!,
    )!;
    const [, tx, ty, scale] = match.map(Number);
    return {
      left: tx! + b.x1 * scale!,
      right: tx! + b.x2 * scale!,
      top: ty! + b.y1 * scale!,
      bottom: ty! + b.y2 * scale!,
    };
  });
}

test("distance glyphs retain their full height, visible tracking and shared unit baseline after outlining", async () => {
  fonts();
  const d = newSignDesign("distance");
  const samples = [
    "14",
    "37",
    "95",
    "2",
    "15",
    "25",
    "105",
    "4444",
    "9999",
    "0.25",
  ];
  for (const number of samples) {
    d.destinations = [
      { name: "南直路", english: "", direction: "straight", distance: number },
      {
        name: "",
        english: "",
        direction: "straight",
        distance: "9999",
        content: "route",
        routeCode: "G101",
        routeType: "national",
      },
    ];
    const doc = new DOMParser().parseFromString(
      await outlineSign(renderSign(d).source),
      "image/svg+xml",
    );
    const glyphs = await visibleGlyphBoxes(
      doc.querySelector(`[aria-label="${number}"]`)!,
    );
    const bottom = Math.max(...glyphs.map((b) => b.bottom)),
      top = Math.min(...glyphs.map((b) => b.top));
    expect(bottom - top, number).toBeCloseTo(36, 3);
    for (let i = 1; i < glyphs.length; i++)
      expect(glyphs[i]!.left - glyphs[i - 1]!.right, number).toBeCloseTo(8, 2);
    const km = await visibleGlyphBoxes(doc.querySelector('[aria-label="km"]')!);
    expect(Math.max(...km.map((b) => b.bottom)), number).toBeCloseTo(bottom, 3);
    const code = doc.querySelector("svg svg")!;
    const codeNumber = await visibleGlyphBoxes(
      [...doc.querySelectorAll('[aria-label="9999"]')].at(-1)!,
    );
    const codeNumberCenter =
      (Math.max(...codeNumber.map((b) => b.bottom)) +
        Math.min(...codeNumber.map((b) => b.top))) /
      2;
    expect(
      Number(code.getAttribute("y")) + Number(code.getAttribute("height")) / 2,
    ).toBeCloseTo(codeNumberCenter, 3);
  }
});

test("stacked directions center the rendered glyphs and arrows within each compact row", async () => {
  fonts();
  const { SIGN_EXAMPLES } = await import("../domain/signs/examples");
  const d = SIGN_EXAMPLES.find(
    (e) => e.design.template === "direction",
  )!.design;
  const doc = new DOMParser().parseFromString(
    await outlineSign(renderSign(d).source),
    "image/svg+xml",
  );
  const arrows = [...doc.documentElement.children].filter(
    (node) => node.localName === "path" && node.hasAttribute("transform"),
  );
  for (const [i, name] of ["大厂", "燕郊"].entries()) {
    const boxes = await visibleGlyphBoxes(
      doc.querySelector(`[aria-label="${name}"]`)!,
    );
    const center =
      (Math.max(...boxes.map((b) => b.bottom)) +
        Math.min(...boxes.map((b) => b.top))) /
      2;
    const arrowCenter = Number(
      /translate\([^ ]+ ([\d.]+)\)/.exec(
        arrows[i]!.getAttribute("transform")!,
      )![1],
    );
    expect(center).toBeCloseTo(arrowCenter, 3);
  }
  const view = doc.documentElement
    .getAttribute("viewBox")!
    .split(" ")
    .map(Number);
  expect(view[2]! / view[3]!).toBeCloseTo(1.375, 3);
});

test("roundabout endpoint names keep the same visible height with and without route shields", async () => {
  fonts();
  const { SIGN_EXAMPLES } = await import("../domain/signs/examples");
  const d = SIGN_EXAMPLES.find(
    (e) => e.design.template === "roundabout",
  )!.design;
  const doc = new DOMParser().parseFromString(
    await outlineSign(renderSign(d).source),
    "image/svg+xml",
  );
  for (const name of ["白涧", "三河", "唐山", "双塔"]) {
    const boxes = await visibleGlyphBoxes(
      doc.querySelector(`[aria-label="${name}"]`)!,
    );
    expect(
      Math.max(...boxes.map((b) => b.bottom)) -
        Math.min(...boxes.map((b) => b.top)),
      name,
    ).toBeCloseTo(50, 3);
  }
});
