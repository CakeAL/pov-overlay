import { LOCATION_FIELDS } from "./location";
/** Coordinates in the original 960 × 130 strip, with independently editable SVGs. */
export interface TelemetryItem {
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  source: string;
}
const item = (
  key: string,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  content: string,
): TelemetryItem => ({
  key,
  label,
  x,
  y,
  width,
  height,
  source: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><g fill="{$Color}" font-family="sans-serif">${content}</g></svg>`,
});
export const TELEMETRY_ITEMS: TelemetryItem[] = [
  item(
    "heading",
    "航向",
    35,
    35,
    60,
    60,
    `<circle cx="30" cy="30" r="28" fill="none" stroke="{$Color}" stroke-width="2"/><g opacity="{$HasHeading}" transform="rotate({$Heading} 30 30)"><path d="M30 8L20 42L30 35L40 42Z"/></g>`,
  ),
  item(
    "coordinates",
    "经纬度",
    125,
    25,
    350,
    40,
    `<text x="0" y="28" font-size="19">{$Latitude}°, {$Longitude}°</text>`,
  ),
  item(
    "elapsed",
    "时间",
    125,
    65,
    200,
    40,
    `<text x="0" y="28" font-size="19">{$Elapsed}</text>`,
  ),
  item(
    "distance",
    "距离",
    515,
    24,
    150,
    80,
    `<text x="0" y="28" font-size="19">距离</text><text x="0" y="67" font-size="27">{$Distance} km</text>`,
  ),
  item(
    "elevation",
    "海拔",
    685,
    24,
    130,
    80,
    `<text x="0" y="28" font-size="19">海拔</text><text x="0" y="67" font-size="27">{$Elevation} m</text>`,
  ),
  item(
    "speed",
    "速度",
    835,
    24,
    125,
    80,
    `<text x="0" y="28" font-size="19">速度</text><text x="0" y="67" font-size="27">{$Speed}</text><text x="71" y="67" font-size="16">km/h</text>`,
  ),
];

const journeyItem = (key: string, label: string, field: string, unit = '') => item(key, label, 0, 0, 220, 80, `<text x="2" y="23" font-size="17">${label}</text><text x="2" y="64" font-size="28">{\$${field}}${unit}</text>`);
export const JOURNEY_ITEMS = [
  journeyItem('currentDistance', '当前里程', 'Distance', ' km'),
  journeyItem('remainingDistance', '剩余里程', 'RemainingDistance', ' km'),
  journeyItem('remainingTime', '剩余时间', 'RemainingTime'),
  journeyItem('totalDistance', '总里程', 'TotalDistance', ' km'),
  journeyItem('totalTime', '总时长', 'TotalTime'),
  journeyItem('progress', '行程进度', 'Progress', '%'),
];
export const LOCATION_ITEMS = LOCATION_FIELDS.map(field => item(field.key, field.label, 0, 0, 400, 52, `<text x="2" y="38" font-size="28">{\$${field.field}}</text>`));
export const ALL_TELEMETRY_ITEMS = [...TELEMETRY_ITEMS, ...JOURNEY_ITEMS, ...LOCATION_ITEMS];
