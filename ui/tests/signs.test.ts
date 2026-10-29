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

test("raster export replaces only lettering, preserving vector panels and embedding PNG", async () => {
  const { rasterizeSignText } = await import(
    "../infrastructure/rasterizeSignText"
  );
  let imageSource = "";
  vi.stubGlobal(
    "Image",
    class {
      onload?: () => void;
      onerror?: () => void;
      set src(value: string) {
        imageSource = value;
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  const context = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  const png = vi
    .spyOn(HTMLCanvasElement.prototype, "toDataURL")
    .mockReturnValue("data:image/png;base64,AA==");
  try {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 400 200"><rect width="400" height="200" fill="green"/><g data-sign-text="true"><path d="M1 1L2 2"/></g></svg>';
    const output = await rasterizeSignText(source);
    const doc = new DOMParser().parseFromString(output, "image/svg+xml");
    expect(doc.querySelector("rect")).not.toBeNull();
    expect(doc.querySelector("[data-sign-text]")).toBeNull();
    expect(doc.querySelector("image")?.getAttribute("href")).toBe(
      "data:image/png;base64,AA==",
    );
    expect(doc.querySelector("image")?.getAttribute("width")).toBe("400");
    expect(decodeURIComponent(imageSource)).not.toContain("<rect");
    await expect(
      rasterizeSignText(source.replace('width="1200"', 'width="100000"')),
    ).rejects.toThrow("8K");
  } finally {
    context.mockRestore();
    png.mockRestore();
  }
});

test('Appendix B assigns normal English to A and road/exit numbers to B', async () => {
  fonts();
  const d=newSignDesign('direction');d.destinations=[{name:'南京',english:'Nanjing',distance:'',direction:'straight'}];
  const output=await outlineSign(renderSign(d).source);const doc=new DOMParser().parseFromString(output,'image/svg+xml');
  const english=doc.querySelector('[aria-label="Nanjing"]')!;expect(english.getAttribute('data-sign-font')).toBe('A');
  const scales=[...english.querySelectorAll('path')].map(p=>p.getAttribute('transform')!.match(/scale\(([^)]+)\)/)![1]);
  expect(new Set(scales).size).toBe(1); // Preserve lowercase proportions and common baseline.
  d.template='exit';d.exitNumber='12';
  const exit=new DOMParser().parseFromString(await outlineSign(renderSign(d).source),'image/svg+xml');
  expect(exit.querySelector('[aria-label="12"]')?.getAttribute('data-sign-font')).toBe('B');
  expect(exit.querySelector('[aria-label="出口"]')?.getAttribute('data-sign-font')).toBe('A');
});
