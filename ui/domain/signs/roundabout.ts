import type { SignDirection } from "./model";

/** Ring and rounded arm junctions used by the graphical roundabout sign. */
export function roundaboutSymbol(
  cx: number,
  cy: number,
  bottom: number,
  directions: SignDirection[],
  background: string,
) {
  const ringRadius = 31,
    ringStroke = 18,
    armWidth = 22,
    half = armWidth / 2,
    outer = ringRadius + ringStroke / 2;
  const diagonalY = -Math.sqrt(1 - 0.53 ** 2);
  const vectors: Record<SignDirection, [number, number]> = {
    left: [-1, 0],
    right: [1, 0],
    upperLeft: [-0.53, diagonalY],
    upperRight: [0.53, diagonalY],
    straight: [0, -1],
  };
  const arms: [number, number][] = [
    [0, 1],
    ...Array.from(new Set(directions), (direction) => vectors[direction]),
  ];
  let source = `<circle cx="${cx}" cy="${cy}" r="${ringRadius}" fill="none" stroke="white" stroke-width="${ringStroke}"/><path d="M${cx} ${bottom}V${cy + ringRadius}" stroke="white" stroke-width="${armWidth}"/>`;
  for (const direction of new Set(directions)) {
    const [dx, dy] = vectors[direction],
      reach = dy === 0 ? 149 : 94;
    const x = cx + dx * reach,
      y = cy + dy * reach;
    source += `<path d="M${cx + dx * ringRadius} ${cy + dy * ringRadius}L${x} ${y}" stroke="white" stroke-width="${armWidth}"/><path d="M0-10L11 1V12H-11V1Z" fill="white" transform="translate(${x} ${y}) rotate(${(Math.atan2(dx, -dy) * 180) / Math.PI})"/>`;
  }
  // Join the facing edges of adjacent arms with tangent quadratic curves.
  const sorted = [...arms].sort(
    (a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]),
  );
  sorted.forEach(([ax, ay], i) => {
    const [bx, by] = sorted[(i + 1) % sorted.length]!;
    const angle =
      (Math.atan2(by, bx) - Math.atan2(ay, ax) + Math.PI * 2) % (Math.PI * 2);
    if (angle > (Math.PI * 2) / 3 || angle < 0.01) return;
    const sin = Math.sin(angle / 2),
      cos = Math.cos(angle / 2);
    const reach =
      ay === 1 || by === 1
        ? 55
        : (2 * (outer + 0.5) - half / sin - half * sin) / cos;
    const x1 = ax * reach - ay * half,
      y1 = ay * reach + ax * half;
    const x2 = bx * reach + by * half,
      y2 = by * reach - bx * half;
    const cross = ax * by - ay * bx;
    const along = ((x2 - x1) * by - (y2 - y1) * bx) / cross;
    const controlX = x1 + along * ax,
      controlY = y1 + along * ay;
    source += `<path d="M${cx + x1} ${cy + y1}Q${cx + controlX} ${cy + controlY} ${cx + x2} ${cy + y2}L${cx} ${cy}Z" fill="white"/>`;
  });
  // Restore the circular island after merging the white arm junctions.
  source += `<circle cx="${cx}" cy="${cy}" r="${ringRadius - ringStroke / 2}" fill="${background}"/>`;
  // A curved, open passage with two distinct sides, rather than a wedge.
  source += `<path data-roundabout-notch="true" d="M${cx - 14} ${cy + 13}L${cx - 30} ${cy + 34}L${cx - 16} ${cy + 44}Q${cx - 10} ${cy + 32} ${cx - 8} ${cy + 20}Q${cx - 11} ${cy + 18} ${cx - 14} ${cy + 13}Z" fill="${background}"/>`;
  return source;
}
