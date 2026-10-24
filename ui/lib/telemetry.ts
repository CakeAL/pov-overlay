import type { Sample, Track } from "./types";
export const MAX_GAP_MS = 30_000;
const EARTH_RADIUS = 6_371_088;
const radians = (value: number) => (value * Math.PI) / 180;
export function distance(
  a: Pick<Sample, "latitude" | "longitude">,
  b: Pick<Sample, "latitude" | "longitude">,
): number {
  const lat = radians(b.latitude - a.latitude),
    lon = radians(b.longitude - a.longitude);
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(lon / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(Math.min(1, h)));
}
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
export function sampleAt(track: Track, timestampMs: number): Sample | null {
  if (timestampMs < track.startMs || timestampMs > track.endMs) return null;
  let low = 0,
    high = track.samples.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const sample = track.samples[middle]!;
    if (sample.timestampMs === timestampMs) return sample;
    if (sample.timestampMs < timestampMs) low = middle + 1;
    else high = middle - 1;
  }
  const a = track.samples[high],
    b = track.samples[low];
  if (
    !a ||
    !b ||
    a.segment !== b.segment ||
    b.timestampMs - a.timestampMs > MAX_GAP_MS
  )
    return null;
  const progress =
    (timestampMs - a.timestampMs) / (b.timestampMs - a.timestampMs);
  const mix = (x: number, y: number) => x + (y - x) * progress;
  const delta = ((b.longitude - a.longitude + 540) % 360) - 180;
  const longitude = ((a.longitude + delta * progress + 540) % 360) - 180;
  return {
    timestampMs,
    latitude: mix(a.latitude, b.latitude),
    longitude,
    elevation:
      a.elevation !== null && b.elevation !== null
        ? mix(a.elevation, b.elevation)
        : null,
    speedMps: mix(a.speedMps, b.speedMps),
    segment: a.segment,
  };
}
export function alignmentOffset(track: Track, capturedAtMs: number): number {
  return (capturedAtMs - track.startMs) / 1000;
}
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "00:00";
  const value = Math.max(0, Math.floor(seconds));
  const h = Math.floor(value / 3600),
    m = Math.floor(value / 60) % 60,
    s = value % 60;
  return `${h ? `${String(h).padStart(2, "0")}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
export function formatCoordinate(
  value: number | undefined,
  axis: "lat" | "lon",
): string {
  if (value === undefined) return "—";
  return `${Math.abs(value).toFixed(6)}° ${axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W"}`;
}
