import { roundaboutSymbol } from "./roundabout";
import { lettering as text, panel, SIGN_COLORS as C } from "./primitives";
import type { SignDesign, SignDestination } from "./model";
export type BadgeRenderer = (
  row: SignDestination,
  x: number,
  y: number,
  height: number,
  onArrow?: boolean,
  centered?: boolean,
) => string;
export function junctionGeometry(d: SignDesign, badge: BadgeRenderer) {
  const t = d.template,
    round = t === "roundabout",
    tall = t === "tJunction",
    tee = tall || t === "wideTJunction",
    split = t === "dividedJunction";
  const numberedT =
    t === "wideTJunction" && d.destinations.some((row) => row.onArrow);
  const w = tall
      ? 230
      : round
        ? 440
        : split
          ? 680
          : numberedT
            ? 500
            : tee
              ? 370
              : 620,
    h = tall ? 320 : round ? 400 : split ? 300 : tee ? 320 : 280;
  let source = panel(w, h, d.green ? C.green : C.blue);
  const cx = tall ? 44 : tee ? 64 : round ? w / 2 + 4 : w / 2,
    cy = tall ? 190 : tee ? 188 : round ? 224 : split ? 195 : 205;
  const head = (x: number, y: number, angle: number) =>
    `<path d="${split ? "M0-25L25 0H9V16H-9V0H-25Z" : "M0-10L9-1V12H-9V-1Z"}" fill="white" transform="translate(${x} ${y}) rotate(${angle})"/>`;
  const arm = (x: number, y: number) =>
    `<path d="M${cx} ${cy}L${x} ${y}" stroke="white" stroke-width="18" stroke-linecap="round"/>`;
  if (round) {
    source += roundaboutSymbol(
      cx,
      cy,
      h - 38,
      d.destinations.map((row) => row.direction),
      d.green ? C.green : C.blue,
    );
  } else {
    source +=
      `<path d="M${cx} ${h - 34}V${tee ? 110 : 105}" stroke="white" stroke-width="18"/>` +
      head(cx, tee ? 105 : 100, 0);
    if (!tee)
      source +=
        arm(split ? 180 : cx - 76, cy) + head(split ? 178 : cx - 86, cy, -90);
    source +=
      arm(tee ? w - 130 : split ? w - 180 : cx + 76, cy) +
      head(tee ? w - 120 : split ? w - 178 : cx + 86, cy, 90);
    if (!split)
      source += tee
        ? `<path d="M${cx + 9} ${cy - 28}Q${cx + 9} ${cy - 9} ${cx + 28} ${cy - 9}V${cy + 9}Q${cx + 9} ${cy + 9} ${cx + 9} ${cy + 28}H${cx - 9}V${cy - 28}Z" fill="white"/>`
        : `<path d="M${cx - 9} ${cy - 28}Q${cx - 9} ${cy - 9} ${cx - 28} ${cy - 9}V${cy + 9}Q${cx - 9} ${cy + 9} ${cx - 9} ${cy + 28}H${cx + 9}Q${cx + 9} ${cy + 9} ${cx + 28} ${cy + 9}V${cy - 9}Q${cx + 9} ${cy - 9} ${cx + 9} ${cy - 28}Z" fill="white"/>`;
    if (split)
      source +=
        `<path d="M${cx - 82} ${cy}l24-24h116l24 24-24 24H${cx - 58}Z" fill="${d.green ? C.green : C.blue}" stroke="white" stroke-width="4"/>` +
        text(
          d.centerRoad ?? "",
          cx - 62,
          cy - 12,
          124,
          24,
          3,
          "white",
          "center",
          "A",
        );
  }
  if (d.cardinal)
    source +=
      `<rect x="${d.cardinalSide === "right" ? w - 44 : 8}" y="8" width="36" height="36" fill="white"/>` +
      text(
        d.cardinal,
        d.cardinalSide === "right" ? w - 40 : 12,
        12,
        28,
        28,
        0,
        C.blue,
      );
  for (const row of d.destinations) {
    let x: number, y: number, box: number;
    if (round) {
      const loc = {
        left: [24, 280, 155],
        right: [281, 248, 150],
        upperLeft: [40, 62, 150],
        upperRight: [281, 60, 150],
        straight: [155, 20, 130],
      }[row.direction];
      [x, y, box] = loc as [number, number, number];
    } else if (tee) {
      [x, y, box] =
        row.direction === "straight"
          ? [tall ? 25 : 30, 30, tall ? 180 : 190]
          : [tall ? 82 : w - 185, tall ? 230 : 210, tall ? 125 : 165];
    } else if (row.direction === "straight") {
      [x, y, box] = [cx - 110, 34, 220];
    } else {
      [x, y, box] =
        row.direction === "left" || row.direction === "upperLeft"
          ? [22, cy - 17, split ? 125 : 180]
          : [split ? w - 145 : cx + 111, cy - 17, split ? 123 : 175];
    }
    if (row.content === "route" && row.routeCode) {
      if (row.onArrow) {
        const bx =
            row.direction === "straight"
              ? cx - 32
              : row.direction === "left"
                ? cx - 105
                : cx + 36,
          by = row.direction === "straight" ? cy - (tee ? 58 : 65) : cy - 14;
        source += badge(row, bx, by, 28, true);
      } else
        source += badge(
          row,
          x + box / 2,
          y - (round ? 32 : 18),
          round ? 62 : 45,
          false,
          true,
        );
      if (row.onArrow && row.endpointRouteCode)
        source += badge(
          {
            ...row,
            routeCode: row.endpointRouteCode,
            routeType: row.endpointRouteCode.startsWith("S")
              ? "provincial"
              : "national",
          },
          x + box / 2,
          y - 78,
          45,
          false,
          true,
        );
      if (row.name)
        source += text(
          row.name,
          x,
          y + (!row.onArrow ? 42 : 0),
          box,
          round ? 50 : 30,
          round ? 12 : 4,
        );
    } else source += text(row.name, x, y, box, round ? 50 : 34, round ? 12 : 6);
    if (row.english)
      source += text(
        row.english,
        x,
        y + (round ? (row.content === "route" ? 98 : 56) : 44),
        box,
        15,
        1,
      );
  }
  return { width: w, height: h, source };
}
export function stackedGeometry(d: SignDesign, badge: BadgeRenderer) {
  const lane = d.template === "laneGuidance",
    w = lane
      ? Math.max(200, d.destinations.length * 150)
      : Math.max(
          220,
          ...d.destinations.map(
            (row) =>
              [...row.name].length * 34 +
              Math.max(0, [...row.name].length - 1) * 7 +
              100,
          ),
        ),
    rowHeight = d.destinations.some((row) => row.english) ? 96 : 72,
    h = lane ? 180 : d.destinations.length * rowHeight + 16;
  let source = panel(w, h, d.green ? C.green : C.blue);
  d.destinations.forEach((row, i) => {
    const right = row.direction === "right" || row.direction === "upperRight";
    const centerY = 8 + (i + 0.5) * rowHeight;
    const x = lane ? (i * w) / d.destinations.length + 15 : right ? 20 : 80,
      y = lane ? 24 : centerY - (row.english ? 30 : 17),
      bw = lane ? w / d.destinations.length - 30 : w - 100;
    if (row.content === "route" && row.routeCode)
      source += badge(
        row,
        x + (right ? 0 : bw / 2),
        lane ? y - 4 : centerY - 22.5,
        45,
        false,
        !right,
      );
    else
      source += text(
        row.name,
        x,
        y,
        bw,
        34,
        7,
        "white",
        !lane && right ? "start" : "center",
      );
    if (row.english) source += text(row.english, x, y + 44, bw, 15, 1);
    const ax = lane
        ? ((i + 0.5) * w) / d.destinations.length
        : right
          ? w - 36
          : 36,
      ay = lane ? 125 : centerY,
      angle = {
        straight: 0,
        left: -90,
        right: 90,
        upperLeft: -45,
        upperRight: 45,
      }[row.direction];
    source +=
      lane && (row.direction === "right" || row.direction === "left")
        ? `<path d="M-7 25V2Q-7-13 10-13H24L14-23L22-31L45-8L22 15L14 7L24-3H12Q7-3 7 4V25Z" fill="white" transform="translate(${ax - 10} ${ay}) scale(${row.direction === "left" ? -1 : 1} 1)"/>`
        : `<path d="M-5 22V-5L-16 6L-22 0L0-22L22 0L16 6L5-5V22Z" fill="white" transform="translate(${ax} ${ay}) rotate(${angle})"/>`;
    if (i < d.destinations.length - 1)
      source += lane
        ? `<path d="M${((i + 1) * w) / d.destinations.length} 14V${h - 14}" stroke="white" stroke-width="2" stroke-dasharray="8 8"/>`
        : `<path d="M10 ${8 + (i + 1) * rowHeight}H${w - 10}" stroke="white" stroke-width="2"/>`;
  });
  return { width: w, height: h, source };
}
