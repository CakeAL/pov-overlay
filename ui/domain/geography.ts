import type {Sample} from "./types";
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
