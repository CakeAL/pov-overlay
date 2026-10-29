import { escapeXml } from "./location";
import type { OverlayContext } from "./overlayContext";
import type { Sample } from "./types";
import { formatTime, formatCoordinate } from "./telemetry";
export function bindSvg(
  source: string,
  sample: Sample | null,
  elapsed: number,
  color: string,
  context: OverlayContext = {},
): string {
  const number = (value: number | null | undefined, digits: number) =>
    value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
  const speed = sample && sample.speedValid !== false ? Math.max(0, sample.speedMps * 3.6) : 0;
  const speedRatio = Math.min(1, speed / Math.max(1, context.speedMaxKmh ?? 60));
  const heading = Number.isFinite(sample?.headingDeg) ? sample!.headingDeg! : 0;
  const place = (field: 'province' | 'city' | 'district' | 'street' | 'road') => escapeXml(context.address?.[field] || '—');
  const values: Record<string, string> = {
    Province: place('province'), City: place('city'), District: place('district'), Street: place('street'), Road: place('road'),
    HasAddress: context.address && Object.values(context.address).some(Boolean) ? '1' : '0',

    Speed: number(
      sample && sample.speedValid !== false ? sample.speedMps * 3.6 : null,
      1,
    ),
    SpeedRatio: speedRatio.toFixed(5),
    SpeedPercent: (speedRatio * 100).toFixed(3),
    SpeedAngle: (-90 + speedRatio * 180).toFixed(3),
    SpeedColor: speedRatio < 0.5 ? '#a7db76' : speedRatio < 0.8 ? '#f3cf69' : '#f27d72',
    Latitude: number(sample?.latitude, 6),
    Longitude: number(sample?.longitude, 6),
    LatitudeDirection: formatCoordinate(sample?.latitude, 'lat'),
    LongitudeDirection: formatCoordinate(sample?.longitude, 'lon'),
    CompassOffset: String(-16 * (Math.round(((heading % 360 + 360) % 360) / 11.25) % 32)),
    Elevation: number(sample?.elevation, 1),
    Heading: number(sample?.headingDeg, 1),
    Distance: number(
      (context.progress?.distanceMeters ?? sample?.distanceMeters) == null ? null : (context.progress?.distanceMeters ?? sample!.distanceMeters!) / 1000,
      2,
    ),
    RemainingDistance: number(context.progress ? context.progress.remainingMeters / 1000 : null, 2),
    TotalDistance: number(context.progress ? context.progress.totalMeters / 1000 : null, 2),
    RemainingTime: context.progress ? formatTime(context.progress.remainingSeconds) : "—",
    TotalTime: context.progress ? formatTime(context.progress.totalSeconds) : "—",
    ProgressRatio: (context.progress?.fraction ?? 0).toFixed(6),
    ProgressPercent: ((context.progress?.fraction ?? 0) * 100).toFixed(4),
    DistanceProgress: number(context.progress ? (context.progress.distanceFraction ?? context.progress.fraction) * 100 : null, 1),
    Progress: number(context.progress ? context.progress.fraction * 100 : null, 1),
    Elapsed: formatTime(elapsed),
    Timestamp: context.timestampMs != null && Number.isFinite(context.timestampMs) ? new Date(context.timestampMs).toISOString() : sample ? new Date(sample.timestampMs).toISOString() : "—",
    Color: /^#[0-9a-f]{6}$/i.test(color) ? color : "#ffffff",
    HasData: sample ? "1" : "0",
    HasSpeed: sample && sample.speedValid !== false ? "1" : "0",
    HasHeading: Number.isFinite(sample?.headingDeg) ? "1" : "0",
  };
  const bound = source.replace(
    /\{\$([A-Za-z][A-Za-z0-9]*)\}/g,
    (_, field: string) => values[field] ?? "—",
  );
  return bound.replace(
    /(transform|x|y|cx|cy|r|rx|ry|width|height|opacity|stroke-width|stroke-dasharray|stroke-dashoffset|pathLength|font-size)=(['"])(.*?)\2/g,
    (_, name: string, quote: string, value: string) =>
      `${name}=${quote}${value.replaceAll("—", "0")}${quote}`,
  );
}
