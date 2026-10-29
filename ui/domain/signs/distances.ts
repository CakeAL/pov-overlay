import { lettering as text, panel, SIGN_COLORS as C } from "./primitives";
import type { SignDesign } from "./model";
import type { BadgeRenderer } from "./junctions";
export function distanceGeometry(d: SignDesign, badge: BadgeRenderer) {
  const rows = [...d.destinations].sort(
    (a, b) => Number(a.distance || 0) - Number(b.distance || 0),
  );
  const nameWidth = Math.max(
    100,
    ...rows.map((r) =>
      r.content === "route"
        ? 90
        : [...r.name].length * 36 + Math.max(0, [...r.name].length - 1) * 6,
    ),
  );
  const digits = Math.max(1, ...rows.map((r) => (r.distance || "0").length));
  const numberWidth = digits * 24 + Math.max(0, digits - 1) * 3;
  const w = Math.max(250, 24 + nameWidth + 22 + numberWidth + 18 + 34 + 24),
    rowH = rows.some((r) => r.english) ? 90 : 56,
    h = 28 + rows.length * rowH;
  let source = panel(w, h, d.green ? C.green : C.blue);
  rows.forEach((row, i) => {
    const y = 20 + i * rowH,
      numberX = w - 24 - 34 - 18 - numberWidth;
    if (row.content === "route" && row.routeCode)
      source += badge(row, 24, y - 4, 48);
    else if (row.content === "roadName")
      source +=
        `<rect x="22" y="${y - 3}" width="${nameWidth + 4}" height="45" rx="3" fill="${C.blue}" stroke="white" stroke-width="2"/>` +
        text(row.name, 28, y + 3, nameWidth - 8, 32, 5, "white", "start");
    else source += text(row.name, 24, y, nameWidth, 36, 6, "white", "start");
    if (row.english)
      source += text(
        row.english,
        24,
        y + 48,
        nameWidth,
        17,
        1,
        "white",
        "start",
      );
    source +=
      text(
        row.distance || "0",
        numberX,
        y,
        numberWidth,
        36,
        3,
        "white",
        "end",
      ) + text("km", w - 58, y + 18, 34, 18, 4, "white", "start");
  });
  return { width: w, height: h, source };
}
