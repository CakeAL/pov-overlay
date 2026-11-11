// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportRenderer } from "../infrastructure/export/renderer";
import type { Widget } from "../domain/types";

const drawImage = vi.fn();
const context = {
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  roundRect: vi.fn(),
  fill: vi.fn(),
  drawImage,
  getImageData: (_x: number, _y: number, width: number, height: number) => ({
    data: new Uint8ClampedArray(width * height * 4),
  }),
  fillStyle: "",
};

beforeEach(() => {
  drawImage.mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.stubGlobal(
    "Image",
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("draws an SVG widget at its own viewBox ratio instead of stretching it to the box", async () => {
  const widget: Widget = {
    id: "square",
    kind: "svg",
    label: "方形 SVG",
    x: 0,
    y: 0,
    scale: 1,
    opacity: 0,
    color: "#ffffff",
    visible: true,
    locked: false,
    widthRatio: 0.2,
    svg: {
      source:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100"/></svg>',
      aspectRatio: 2,
    },
  };
  const renderer = new ExportRenderer(1920, 1080, 16 / 9, [widget]);

  await renderer.frame(null, 0);

  expect(drawImage).toHaveBeenCalledTimes(1);
  const [, x, y, width, height] = drawImage.mock.calls[0]! as [
    HTMLImageElement,
    number,
    number,
    number,
    number,
  ];
  expect(width).toBeCloseTo(height);
  expect(width).toBeCloseTo(100);
  expect(x).toBeCloseTo(50);
  expect(y).toBe(0);
  renderer.dispose();
});
