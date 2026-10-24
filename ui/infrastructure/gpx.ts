import type { Sample, Track } from "../domain/types";
import { distance, MAX_GAP_MS } from "../domain/telemetry";

const children = (node: Element, name: string) =>
  Array.from(node.children).filter((child) => child.localName === name);
const childText = (node: Element, name: string) =>
  children(node, name)[0]?.textContent?.trim() ?? "";
/** Browser development fallback. The desktop application uses the shared Rust core. */
export function parseGpx(xml: string): Track {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (
    document.querySelector("parsererror") ||
    document.documentElement.localName !== "gpx"
  )
    throw new Error("无法解析 GPX，请选择有效的 GPX 轨迹文件。");
  const tracks = children(document.documentElement, "trk");
  const samples: Sample[] = [];
  let skippedPoints = 0,
    segment = 0;
  for (const track of tracks)
    for (const section of children(track, "trkseg")) {
      for (const point of children(section, "trkpt")) {
        const rawTime = childText(point, "time");
        const timestampMs = /(?:Z|[+-]\d\d:\d\d)$/i.test(rawTime)
          ? Date.parse(rawTime)
          : NaN;
        const latitude = point.hasAttribute("lat")
          ? Number(point.getAttribute("lat"))
          : NaN;
        const longitude = point.hasAttribute("lon")
          ? Number(point.getAttribute("lon"))
          : NaN;
        if (
          ![timestampMs, latitude, longitude].every(Number.isFinite) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180
        ) {
          skippedPoints++;
          continue;
        }
        const rawElevation = childText(point, "ele");
        const elevation =
          rawElevation !== "" && Number.isFinite(Number(rawElevation))
            ? Number(rawElevation)
            : null;
        samples.push({
          timestampMs,
          latitude,
          longitude,
          elevation,
          speedMps: 0,
          segment,
        });
      }
      segment++;
    }
  samples.sort((a, b) => a.timestampMs - b.timestampMs);
  const unique = samples.filter(
    (sample, index) =>
      !index || sample.timestampMs !== samples[index - 1]!.timestampMs,
  );
  skippedPoints += samples.length - unique.length;
  if (unique.length < 2)
    throw new Error("GPX 至少需要两个带有效时间戳的不同轨迹点。");
  let distanceMeters = 0;
  for (let index = 1; index < unique.length; index++) {
    const a = unique[index - 1]!,
      b = unique[index]!;
    const delta = b.timestampMs - a.timestampMs;
    if (a.segment !== b.segment || delta > MAX_GAP_MS) continue;
    const meters = distance(a, b);
    distanceMeters += meters;
    b.speedMps = meters / (delta / 1000);
    const previous = unique[index - 2];
    if (
      !previous ||
      previous.segment !== a.segment ||
      a.timestampMs - previous.timestampMs > MAX_GAP_MS
    )
      a.speedMps = b.speedMps;
  }
  return {
    name:
      tracks.map((track) => childText(track, "name")).find(Boolean) ??
      "未命名轨迹",
    samples: unique,
    startMs: unique[0]!.timestampMs,
    endMs: unique.at(-1)!.timestampMs,
    distanceMeters,
    skippedPoints,
  };
}
