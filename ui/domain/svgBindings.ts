import type { Sample } from "./types";
import { formatTime } from "./telemetry";
export function bindSvg(
  source: string,
  sample: Sample | null,
  elapsed: number,
  color: string,
): string {
  const number = (value: number | null | undefined, digits: number) =>
    value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
  const values: Record<string, string> = {
    Speed: number(sample ? sample.speedMps * 3.6 : null, 1),
    Latitude: number(sample?.latitude, 6),
    Longitude: number(sample?.longitude, 6),
    Elevation: number(sample?.elevation, 1),
    Heading: number(sample?.headingDeg, 1),
    Distance: number(
      sample?.distanceMeters == null ? null : sample.distanceMeters / 1000,
      2,
    ),
    Elapsed: formatTime(elapsed),
    Timestamp: sample ? new Date(sample.timestampMs).toISOString() : "—",
    Color: /^#[0-9a-f]{6}$/i.test(color) ? color : "#ffffff",
    HasData: sample ? "1" : "0",
    HasHeading: sample?.headingDeg == null ? "0" : "1",
  };
  const bound = source.replace(
    /\{\$([A-Za-z][A-Za-z0-9]*)\}/g,
    (_, field: string) => values[field] ?? "—",
  );
  return bound.replace(
    /(transform|x|y|cx|cy|r|rx|ry|width|height|opacity|stroke-width|font-size)=(['"])(.*?)\2/g,
    (_, name: string, quote: string, value: string) =>
      `${name}=${quote}${value.replaceAll("—", "0")}${quote}`,
  );
}
