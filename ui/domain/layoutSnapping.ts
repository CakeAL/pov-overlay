export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SnapGuides {
  x: number | null;
  y: number | null;
}
interface AxisRect {
  start: number;
  size: number;
}

function snapAxis(
  position: number,
  size: number,
  others: AxisRect[],
  pixels: number,
  safeArea: boolean,
) {
  const raw = Math.max(0, Math.min(1 - size, position));
  let value = raw,
    guide: number | null = null,
    nearest = 7 / pixels;
  function consider(candidate: number, line: number) {
    if (candidate < -1e-9 || candidate > 1 - size + 1e-9) return;
    const delta = Math.abs(raw - candidate);
    if (delta + 1e-9 < nearest) {
      value = Math.max(0, Math.min(1 - size, candidate));
      guide = line;
      nearest = delta;
    }
  }
  consider(0, 0);
  consider(0.5 - size / 2, 0.5);
  consider(1 - size, 1);
  if (safeArea) {
    consider(0.04, 0.04);
    consider(0.96 - size, 0.96);
  }
  for (const other of others) {
    for (const target of [
      other.start,
      other.start + other.size / 2,
      other.start + other.size,
    ])
      for (const anchor of [0, size / 2, size])
        consider(target - anchor, target);
    const gap = 8 / pixels;
    consider(other.start + other.size + gap, other.start + other.size + gap);
    consider(other.start - size - gap, other.start - gap);
  }

  return { value, guide };
}

/** Nearest alignment within 7 screen pixels; positions and guides use canvas fractions. */
export function snapLayout(
  moving: LayoutRect,
  targets: LayoutRect[],
  canvas: { width: number; height: number },
  safeArea = true,
): { x: number; y: number; guides: SnapGuides } {
  const x = snapAxis(
    moving.x,
    moving.width,
    targets.map((rect) => ({ start: rect.x, size: rect.width })),
    Math.max(1, canvas.width),
    safeArea,
  );
  const y = snapAxis(
    moving.y,
    moving.height,
    targets.map((rect) => ({ start: rect.y, size: rect.height })),
    Math.max(1, canvas.height),
    safeArea,
  );
  return { x: x.value, y: y.value, guides: { x: x.guide, y: y.guide } };
}
