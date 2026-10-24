export const MAX_GAP_MS = 30_000;

export interface Sample {
  timestampMs: number;
  latitude: number;
  longitude: number;
  elevation: number | null;
  speedMps: number;
  segment: number;
  headingDeg?: number | null;
  distanceMeters?: number;
  speedSlope?: number;
  /** Derived validity: coordinates can exist before speed has two observations. */
  speedValid?: boolean;
}
export interface Track {
  name: string;
  samples: Sample[];
  startMs: number;
  endMs: number;
  distanceMeters: number;
  skippedPoints: number;
  /** Derived sampling setting; raw tracks do not store this. */
  stopThresholdMps?: number;
}
export interface VideoAsset {
  path?: string;
  name: string;
  url: string;
  capturedAtMs: number | null;
  timeSource: string | null;
  warning: string | null;
  duration: number;
}
export type WidgetKind = "speed" | "coordinates" | "svg";
export interface Widget {
  id: string;
  kind: WidgetKind;
  label: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  color: string;
  visible: boolean;
  locked: boolean;
  svg?: { source: string; aspectRatio: number };
  widthRatio?: number;
  typography?: { fontFamily?: string; fontSize?: number; bold?: boolean; italic?: boolean };
}
export function defaultWidgets(): Widget[] {
  return [
    {
      id: "speed",
      kind: "speed",
      label: "速度",
      x: 0.055,
      y: 0.69,
      scale: 1,
      opacity: 0,
      color: "#c7f284",
      visible: true,
      locked: false,
    },
    {
      id: "coordinates",
      kind: "coordinates",
      label: "经纬度",
      x: 0.645,
      y: 0.79,
      scale: 1,
      opacity: 0,
      color: "#c7f284",
      visible: true,
      locked: false,
    },
  ];
}

export interface ImageAsset {
  name: string;
  url: string;
  width: number;
  height: number;
}

export interface TrackSource {
  id: string;
  name: string;
  track: Track;
  enabled?: boolean;
  /** Reinterpret incorrectly UTC-tagged local clocks using this fixed offset. */
  utcLabelOffsetMinutes?: number | null;
}
