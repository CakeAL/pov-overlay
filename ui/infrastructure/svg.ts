import DOMPurify from "dompurify";
export const SVG_FIELDS = [
  "Speed", "SpeedRatio", "SpeedPercent", "SpeedAngle", "SpeedColor",
  "Latitude",
  "Longitude",
  "LatitudeDirection", "LongitudeDirection", "CompassOffset",
  "Elevation",
  "Heading",
  "Distance",
  "RemainingDistance", "TotalDistance", "RemainingTime", "TotalTime", "Progress", "ProgressRatio", "ProgressPercent", "DistanceProgress",
  "Elapsed",
  "Timestamp",
  "Color",
  "HasData",
  "HasSpeed",
  "HasHeading",
  "Province", "City", "District", "Street", "Road", "HasAddress",
] as const;
export function sanitizeSvg(source: string): {
  source: string;
  aspectRatio: number;
} {
  if (source.length > 2 * 1024 * 1024) throw new Error("SVG 不能超过 2 MB。");
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  if (
    parsed.querySelector("parsererror") ||
    parsed.documentElement.localName !== "svg"
  )
    throw new Error("请选择有效的 SVG 文件。");
  for (const [, field] of source.matchAll(/\{\$([A-Za-z][A-Za-z0-9]*)\}/g))
    if (!(SVG_FIELDS as readonly string[]).includes(field!))
      throw new Error(`不支持的 SVG 字段：${field}`);
  const clean = DOMPurify.sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: [
      "script",
      "foreignObject",
      "animate",
      "animateTransform",
      "set",
    ],
    ADD_ATTR: ["xmlns"],
  });
  const doc = new DOMParser().parseFromString(clean, "image/svg+xml"),
    svg = doc.documentElement;
  if (svg.localName !== "svg") throw new Error("SVG 内容无效。");
  for (const node of [svg, ...Array.from(svg.querySelectorAll("*"))]) {
    for (const attr of Array.from(node.attributes)) {
      const name = attr.localName.toLowerCase(),
        value = attr.value.trim();
      if (
        name.startsWith("on") ||
        (name === "href" &&
          !value.startsWith("#") &&
          !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(value))
      )
        node.removeAttributeNode(attr);
      else if (/url\s*\(/i.test(value))
        node.setAttribute(
          attr.name,
          value.replace(/url\(([^)]*)\)/gi, (_, v: string) =>
            v
              .trim()
              .replace(/^['"]|['"]$/g, "")
              .startsWith("#")
              ? `url(${v})`
              : "none",
          ),
        );
    }
    if (node.localName === "style")
      node.textContent = (node.textContent ?? "")
        .replace(/@import[^;]*;?/gi, "")
        .replace(/url\(([^)]*)\)/gi, (_, v: string) =>
          v
            .trim()
            .replace(/^['"]|['"]$/g, "")
            .startsWith("#")
            ? `url(${v})`
            : "none",
        );
  }
  const viewBox = svg
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const width = viewBox?.[2] ?? parseFloat(svg.getAttribute("width") ?? "300"),
    height = viewBox?.[3] ?? parseFloat(svg.getAttribute("height") ?? "150");
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    width / height > 100 ||
    height / width > 100
  )
    throw new Error("SVG 的尺寸或 viewBox 无效。");
  if (!viewBox) svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  return {
    source: new XMLSerializer().serializeToString(svg),
    aspectRatio: width / height,
  };
}
