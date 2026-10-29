import { junctionGeometry, stackedGeometry } from "./junctions";
import { distanceGeometry } from "./distances";
import { escapeXml as xml } from "../location";
import {
  newSignDesign,
  type SignDestination,
  isExpressway,
  isRouteNumber,
  signCode,
  signLabel,
  validateSign,
  type SignDesign,
} from "./model";
import { SIGN_COLORS, lettering, panel } from "./primitives";
export { SIGN_COLORS } from "./primitives";
const C = SIGN_COLORS;
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
    if (named && digits <= 2) w = 250;
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
      "highway.banner",
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
            "highway.code",
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
          lettering(
            "highway.suffix",
            code.slice(3),
            0,
            30,
            84,
            60,
            10,
            C.white,
            "center",
            "B",
          ) +
          "</g>";
      } else
        s += lettering(
          "highway.code",
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
    if (named) {
      const count = [...d.roadName].length;
      const nameHeight = Math.min(
        40,
        (w - 40) / (count + Math.max(0, count - 1) * 0.22),
      );
      s += lettering(
        "road.name",
        d.roadName,
        20,
        172 + (40 - nameHeight) / 2,
        w - 40,
        nameHeight,
        nameHeight * 0.22,
      );
    }
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
        "road.code",
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
    w = Math.max(
      220,
      [...d.roadName].length * 64 +
        Math.max(0, [...d.roadName].length - 1) * 13 +
        90,
    );
    h = d.english ? 170 : 150;
    s =
      panel(w, h, d.template === "urbanExpressway" ? C.green : C.blue) +
      lettering(
        "road.name",
        d.roadName,
        32,
        d.english ? 28 : 43,
        w - 64,
        64,
        13,
      );
    if (d.english)
      s += lettering("road.english", d.english, 32, 115, w - 64, 22, 2);
  } else if (
    [
      "crossroads",
      "roundabout",
      "tJunction",
      "wideTJunction",
      "dividedJunction",
      "direction",
      "laneGuidance",
      "distance",
    ].includes(d.template)
  ) {
    const badge = (
      row: SignDestination,
      x: number,
      y: number,
      height: number,
      onArrow = false,
      centered = false,
      key = `destination.${row.id ?? d.destinations.indexOf(row)}.route`,
    ) => {
      const type =
        row.routeType ??
        (row.routeCode?.startsWith("S") ? "provincial" : "national");
      const nested = newSignDesign(type);
      nested.code = (row.routeCode ?? "G101").slice(1);
      nested.province = "";
      nested.outputWidth = 300;
      const raw = renderSign(nested).source;
      const view = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(raw)!;
      const width = (height * Number(view[1])) / Number(view[2]);
      return raw
        .replace("<svg ", '<svg overflow="visible" ')
        .replace(
          /data-sign-key="([^"]+)"/g,
          (_, nestedKey: string) =>
            `data-sign-key="${xml(`${key}.${nestedKey}`)}"`,
        )
        .replace(
          /width="[^"]+" height="[^"]+"/,
          `x="${centered ? x - width / 2 : x}" y="${y}" width="${width}" height="${height}"`,
        )
        .replaceAll(
          'data-sign-font="B"',
          `data-sign-font="${onArrow ? "C" : "B"}"`,
        );
    };
    const geometry =
      d.template === "distance"
        ? distanceGeometry(d, badge)
        : d.template === "direction" || d.template === "laneGuidance"
          ? stackedGeometry(d, badge)
          : junctionGeometry(d, badge);
    w = geometry.width;
    h = geometry.height;
    s = geometry.source;
  }
  const height = Math.round((d.outputWidth * h) / w);
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="${d.outputWidth}" height="${height}" viewBox="0 0 ${w} ${h}" role="img"><title>${xml(label)}</title>${s}</svg>`;
  return {
    source,
    width: d.outputWidth,
    height,
    label,
    viewWidth: w,
    viewHeight: h,
  };
}
