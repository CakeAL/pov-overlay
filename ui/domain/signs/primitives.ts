import { escapeXml } from "../location";
export const SIGN_COLORS = {
  green: "#2d9141",
  red: "#d9252a",
  white: "#ffffff",
  yellow: "#f4eb35",
  black: "#000000",
  blue: "#2c5190",
};
export function lettering(
  key: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h: number,
  gap = 0,
  ink = "#ffffff",
  align = "center",
  font: "A" | "B" | "C" = "A",
) {
  return value
    ? `<text data-sign-key="${escapeXml(key)}" data-sign-font="${font}" data-letter-box="${x} ${y} ${w} ${h}" data-gap="${gap}" data-align="${align}" x="${x}" y="${y + h}" font-size="${h}" fill="${ink}">${escapeXml(value)}</text>`
    : "";
}
export function panel(w: number, h: number, fill: string) {
  return `<rect width="${w}" height="${h}" rx="14" fill="${fill}"/><rect x="6" y="6" width="${w - 12}" height="${h - 12}" rx="10" fill="none" stroke="white" stroke-width="3"/>`;
}
