import { escapeXml as xml } from "../location";
import {
  isExpressway,
  isRouteNumber,
  signCode,
  signLabel,
  validateSign,
  type SignDesign,
  type SignDirection,
} from "./model";
export const SIGN_COLORS = {
  green: "#359b47",
  red: "#ee2d2d",
  white: "#ffffff",
  yellow: "#f4eb35",
  black: "#000000",
  blue: "#2c64ad",
};
const C = SIGN_COLORS;
// Bounding boxes describe visible glyph height, rather than font em size (GB 5768.2 Appendix C).
function lettering(
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  gap = 0,
  ink = C.white,
  align = "center",
  font: "A" | "B" | "C" = "A",
) {
  return value
    ? `<text data-sign-font="${font}" data-letter-box="${x} ${y} ${w} ${h}" data-gap="${gap}" data-align="${align}" x="${x}" y="${y + h}" font-size="${h}" fill="${ink}">${xml(value)}</text>`
    : "";
}
function panel(w: number, h: number, fill: string) {
  return `<rect width="${w}" height="${h}" rx="14" fill="${fill}"/><rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="10" fill="none" stroke="${C.white}" stroke-width="3"/>`;
}
function arrow(direction: SignDirection, x: number, y: number, scale = 1) {
  const angle = {
    straight: 0,
    left: -90,
    right: 90,
    upperLeft: -45,
    upperRight: 45,
  }[direction];
  return `<path d="M-4 18V-7L-13 2L-18-3L0-21L18-3L13 2L4-7V18Z" transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})" fill="white"/>`;
}
export function renderSign(d: SignDesign) {
  validateSign(d, false);
  let w = 400,
    h = 160,
    s = "";
  const highway = isExpressway(d.template),
    route = isRouteNumber(d.template),
    label = signLabel(d);
  if (highway) {
    // Appendix C, table C.1 / figure C.3: 1/2/4 digit panels are 100/125/170 wide.
    const digits = Math.max(1, d.code.length),
      named = !!d.roadName.trim();
    w = ({ 1: 200, 2: 250, 3: 300, 4: 340 } as Record<number, number>)[digits]!;
    h = named ? 240 : 200;
    const border = named ? 12 : 6,
      round = named ? 10 : 16;
    s = named
      ? `<rect width="${w}" height="${h}" rx="22" fill="${C.green}"/>`
      : "";
    s += `<rect x="${named ? 6 : 0}" y="${named ? 6 : 0}" width="${w - (named ? 12 : 0)}" height="${h - (named ? 12 : 0)}" rx="16" fill="white"/>`;
    s += `<path d="M${border + round} ${border}H${w - border - round}Q${w - border} ${border} ${w - border} ${border + round}V${border + 40}H${border}V${border + round}Q${border} ${border} ${border + round} ${border}Z" fill="${d.template === "nationalExpressway" ? C.red : C.yellow}"/>`;
    s += `<path d="M${border} ${border + 40}H${w - border}V${h - border - round}Q${w - border} ${h - border} ${w - border - round} ${h - border}H${border + round}Q${border} ${h - border} ${border} ${h - border - round}Z" fill="${C.green}"/>`;
    const banner =
      d.template === "nationalExpressway" ? "国家高速" : `${d.province}高速`;
    const bw =
      digits === 4
        ? 198
        : digits === 3
          ? 178
          : d.template === "nationalExpressway"
            ? 140
            : 100;
    s += lettering(
      banner,
      (w - bw) / 2,
      named ? 22 : 16,
      bw,
      20,
      -1,
      d.template === "nationalExpressway" ? C.white : C.black,
    );
    if (d.code) {
      const code = signCode(d);
      if (digits === 4) {
        s +=
          `<g data-number-cluster="${w}" data-cluster-gap="11" data-cluster-y="${named ? 68 : 74}">` +
          lettering(
            code.slice(0, 3),
            0,
            0,
            236,
            90,
            18,
            C.white,
            "center",
            "B",
          ) +
          lettering(code.slice(3), 0, 30, 84, 60, 10, C.white, "center", "B") +
          "</g>";
      } else
        s += lettering(
          code,
          20,
          named ? 68 : 74,
          w - 40,
          90,
          digits === 1 ? 17 : digits === 2 ? 19 : 9,
          C.white,
          "center",
          "B",
        );
    }
    if (named) s += lettering(d.roadName, 20, 172, w - 40, 40, -1);
  } else if (route) {
    w = 420;
    h = 200;
    const fill =
        d.template === "national"
          ? C.red
          : d.template === "provincial"
            ? C.yellow
            : C.white,
      ink = d.template === "national" ? C.white : C.black;
    s =
      `<rect width="420" height="200" rx="38" fill="${fill}"/><rect x="10" y="10" width="400" height="180" rx="27" fill="${ink}"/><rect x="19" y="19" width="382" height="162" rx="18" fill="${fill}"/>` +
      lettering(
        d.code ? signCode(d) : "",
        58,
        43,
        304,
        112,
        20,
        ink,
        "center",
        "B",
      );
  } else if (["roadName", "urbanExpressway"].includes(d.template)) {
    w = 380;
    h = d.english ? 170 : 150;
    s =
      panel(w, h, d.template === "urbanExpressway" ? C.green : C.blue) +
      lettering(d.roadName, 32, d.english ? 28 : 43, 316, 64, 13);
    if (d.english) s += lettering(d.english, 32, 115, 316, 22, 2);
  } else if (["crossroads", "roundabout"].includes(d.template)) {
    w = 500;
    h = 420;
    s = panel(w, h, d.green ? C.green : C.blue);
    if (d.template === "roundabout")
      s +=
        '<circle cx="250" cy="215" r="35" fill="none" stroke="white" stroke-width="14"/><path d="M250 250V370M215 215H70M285 215H430M250 180V90" fill="none" stroke="white" stroke-width="14"/>';
    else
      s +=
        '<path d="M250 370V100M90 230H410" stroke="white" stroke-width="16"/>';
    s +=
      arrow("straight", 250, 90) +
      arrow("left", 75, 230) +
      arrow("right", 425, 230);
    for (const row of d.destinations) {
      const side =
        row.direction === "left" || row.direction === "upperLeft"
          ? "left"
          : row.direction === "straight"
            ? "straight"
            : "right";
      const x = side === "left" ? 24 : side === "right" ? 310 : 150,
        y = side === "straight" ? 30 : 260;
      s += lettering(row.name, x, y, side === "straight" ? 200 : 165, 36, 4);
      if (row.english) s += lettering(row.english, x, y + 52, 165, 17, 1);
    }
  } else if (["interchange", "fork"].includes(d.template)) {
    w = 600;
    h = 390;
    s =
      panel(w, h, C.green) +
      `<path d="M300 340V200L160 95M300 200L440 95" fill="none" stroke="white" stroke-width="14"/>` +
      arrow("upperLeft", 155, 90, 1.4) +
      arrow("upperRight", 445, 90, 1.4);
    d.destinations.forEach((r, i) => {
      const left = r.direction === "left" || r.direction === "upperLeft";
      s += lettering(r.name, left ? 25 : 365, 150, 210, 42, 4);
      if (r.english)
        s += lettering(r.english, left ? 25 : 365, 210, 210, 22, 1);
    });
  } else {
    const dist = d.template === "distance",
      exit = d.template === "exit" || d.template === "entrance",
      free = d.template === "free";
    w = free ? d.freeWidth : 500;
    const rowH = 100,
      top = exit ? 90 : 20;
    h = free ? d.freeHeight : top + d.destinations.length * rowH + 20;
    s = panel(w, h, exit || d.green ? C.green : C.blue);
    if (exit)
      s +=
        lettering(
          d.template === "exit" ? "出口" : "入口",
          25,
          25,
          65,
          32,
          3,
          C.white,
          "start",
        ) +
        lettering(d.exitNumber, 105, 25, 130, 32, 3, C.white, "start", "B") +
        lettering(d.exitDistance, w - 200, 25, 175, 32, 2, C.white, "end") +
        `<path d="M15 77H${w - 15}" stroke="white" stroke-width="2"/>`;
    d.destinations.forEach((r, i) => {
      const y = top + i * (free ? (h - 40) / d.destinations.length : rowH),
        rh = free ? Math.min(60, ((h - 40) / d.destinations.length) * 0.6) : 40;
      const rightArrow =
        d.template === "direction" &&
        (r.direction === "right" || r.direction === "upperRight");
      if (!dist) s += arrow(r.direction, rightArrow ? w - 45 : 45, y + 40);
      s += lettering(
        r.name,
        dist ? 28 : rightArrow ? 25 : 85,
        y + 14,
        dist ? w - 200 : w - 110,
        rh,
        4,
        C.white,
        "start",
      );
      if (r.english)
        s += lettering(
          r.english,
          dist ? 28 : rightArrow ? 25 : 85,
          y + 70,
          dist ? w - 200 : w - 110,
          18,
          1,
          C.white,
          "start",
        );
      if (dist)
        s += lettering(
          `${r.distance || "0"} km`,
          w - 150,
          y + 25,
          125,
          34,
          3,
          C.white,
          "end",
        );
      if (d.template === "direction" && i < d.destinations.length - 1)
        s += `<path d="M10 ${y + rowH}H${w - 10}" stroke="white" stroke-width="2"/>`;
    });
  }
  const height = Math.round((d.outputWidth * h) / w);
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${d.outputWidth}" height="${height}" viewBox="0 0 ${w} ${h}" role="img"><title>${xml(label)}</title>${s}</svg>`;
  return { source, width: d.outputWidth, height, label };
}
