import { escapeXml, LOCATION_FIELDS } from "./location";

export const MAX_TEXT_LENGTH = 2000;
export const MAX_TEXT_LINES = 20;
export const DEFAULT_LOCATION_TEXT = "{$Province} {$City} {$District}\n{$Road}";
export const TEXT_FIELDS = [
  ...LOCATION_FIELDS.map(({ field, label }) => ({ field, label })),
  { field: "Speed", label: "速度（km/h）" },
  { field: "Elevation", label: "海拔（m）" },
  { field: "Distance", label: "里程（km）" },
  { field: "RemainingDistance", label: "剩余里程（km）" },
  { field: "TotalDistance", label: "总里程（km）" },
  { field: "Elapsed", label: "播放时间" },
  { field: "RemainingTime", label: "剩余时间" },
  { field: "TotalTime", label: "总时长" },
  { field: "Timestamp", label: "UTC 时间" },
  { field: "Progress", label: "行程进度（%）" },
  { field: "Latitude", label: "纬度" },
  { field: "Longitude", label: "经度" },
  { field: "LatitudeDirection", label: "纬度（N/S）" },
  { field: "LongitudeDirection", label: "经度（E/W）" },
  { field: "Heading", label: "航向（°）" },
] as const;

export function textLineSizes(
  template: string,
  fontSize = 32,
  sizes: (number | null)[] = [],
): number[] {
  return template
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((_, i) => sizes[i] ?? fontSize);
}
export function textOverlayAspect(
  template: string,
  fontSize = 32,
  sizes: (number | null)[] = [],
): number {
  return (
    800 /
    textLineSizes(template, fontSize, sizes).reduce(
      (sum, size) => sum + size * 1.5,
      16,
    )
  );
}

export function textOverlaySource(
  template: string,
  fontSize = 32,
  sizes: (number | null)[] = [],
): string {
  const lines = template.replace(/\r\n?/g, "\n").split("\n");
  if (template.length > MAX_TEXT_LENGTH || lines.length > MAX_TEXT_LINES)
    throw new Error(
      `文本最多 ${MAX_TEXT_LENGTH} 个字符、${MAX_TEXT_LINES} 行。`,
    );
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(template))
    throw new Error("文本包含无效字符。");
  const resolved = textLineSizes(template, fontSize, sizes);
  let top = 8;
  const content = lines
    .map((line, i) => {
      const size = resolved[i]!;
      const y = top + size;
      top += size * 1.5;
      return `<text x="16" y="${y}" font-size="${size}">${escapeXml(line)}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 ${top + 8}"><g fill="{$Color}" font-family="sans-serif" font-size="${fontSize}" xml:space="preserve">${content}</g></svg>`;
}

/** Keep long lines inside the text box after binding and applying typography. */
export function fitTextOverlay(source: string, fontSize = 32): string {
  return source.replace(
    /<text\b([^>]*)>([^<]*)<\/text>/g,
    (_, attrs: string, content: string) => {
      const plain = content.replace(/&(?:amp|lt|gt|quot|apos);/g, "x");
      const lineSize = Number(
        attrs.match(/font-size="([\d.]+)"/)?.[1] ?? fontSize,
      );
      const width = Array.from(plain).reduce(
        (sum, ch) => sum + (ch.charCodeAt(0) <= 0x7f ? 0.75 : 1.15) * lineSize,
        0,
      );
      return `<text${attrs}${width > 768 ? ' textLength="768" lengthAdjust="spacingAndGlyphs"' : ""}>${content}</text>`;
    },
  );
}
