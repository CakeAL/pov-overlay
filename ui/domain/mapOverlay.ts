import type { MapProvider } from "./appSettings";
import { mapCoordinate } from './mapCoordinates';
import type { Sample, Widget } from './types';
import type { OverlayContext } from './overlayContext';
import { MAX_GAP_MS } from './types';
export const mercator = (latitude: number, longitude: number, zoom: number) => {
  const lat = Math.max(-85.05112878, Math.min(85.05112878, latitude)) * Math.PI / 180;
  const n = 2 ** zoom;
  return { x: ((longitude + 180) / 360) * n, y: (1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2 * n };
};
export interface MapTile { provider?: MapProvider; z: number; x: number; y: number; left: number; top: number }
export function mapScene(widget: Widget, sample: Sample | null, context: OverlayContext) {
  const track = context.track;
  let index = 0;
  if (track) {
    let low = 0, high = track.samples.length;
    while (low < high) { const mid = (low + high) >>> 1; if (track.samples[mid]!.timestampMs <= (context.timestampMs ?? 0)) low = mid + 1; else high = mid; }
    index = Math.max(0, low - 1);
  }
  const center = sample ?? track?.samples[index];
  if (!center) return { tiles: [] as MapTile[], angle: 0, path: '', marker: false, heading: null };
  const provider = widget.map?.provider ?? 'osm';
  const zoom = Math.round(Math.max(2, Math.min(provider === 'amap' ? 17 : 19, widget.map?.zoom ?? 14)));
  // AMap static maps use twice the pixel scale of OSM at the same zoom.
  const pixels = provider === 'amap' ? 512 : 256;
  const coordinates = mapCoordinate(center.latitude, center.longitude, provider);
  const n = 2 ** zoom, p = mercator(coordinates.latitude, coordinates.longitude, zoom);
  const tiles: MapTile[] = [];
  if (provider !== 'amap') for (let y = Math.floor(p.y - 0.84); y <= Math.floor(p.y + 0.84); y++)
    for (let x = Math.floor(p.x - 0.84); x <= Math.floor(p.x + 0.84); x++)
      if (y >= 0 && y < n) tiles.push({ provider, z: zoom, x: ((x % n) + n) % n, y, left: 150 + (x - p.x) * 256, top: 150 + (y - p.y) * 256 });
  const angle = widget.map?.headingUp && center.headingDeg != null ? -center.headingDeg : 0;
  let path = '';
  if (track && widget.map?.showRoute !== false) {
    const start = Math.max(0, index - 500), end = Math.min(track.samples.length, index + 501);
    for (let i = start; i < end; i++) {
      const point = track.samples[i]!, prev = track.samples[i - 1];
      const position = mapCoordinate(point.latitude, point.longitude, provider);
      const q = mercator(position.latitude, position.longitude, zoom);
      const x = 150 + ((((q.x - p.x + n / 2) % n) + n) % n - n / 2) * pixels;
      const y = 150 + (q.y - p.y) * pixels;
      const broken = i === start || !prev || prev.segment !== point.segment || point.timestampMs - prev.timestampMs > MAX_GAP_MS;
      path += `${broken ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
    }
  }
  const grid = pixels / 64;
  const ax = Math.round(p.x * grid) / grid, ay = Math.round(p.y * grid) / grid;
  const raster = provider === 'amap' ? { longitude: ax/n*360-180, latitude: Math.atan(Math.sinh(Math.PI*(1-2*ay/n)))*180/Math.PI, zoom, left: 150+(ax-p.x)*pixels-256, top: 150+(ay-p.y)*pixels-256 } : undefined;
  return { tiles, raster, angle, path, marker: !!sample, heading: sample?.headingDeg ?? null };
}
export function mapSvg(widget: Widget, scene: ReturnType<typeof mapScene>, sources: string[]): string {
  const images = scene.raster ? `<image x="${scene.raster.left}" y="${scene.raster.top}" width="512" height="512" href="${sources[0]}"/>` : scene.tiles.map((tile, i) => `<image x="${tile.left}" y="${tile.top}" width="256" height="256" href="${sources[i]}"/>`).join('');
  const opacity = Math.max(0, Math.min(100, widget.map?.opacity ?? 100)) / 100;
  const color = /^#[0-9a-f]{6}$/i.test(widget.color) ? widget.color : '#73a343';
  const marker = !scene.marker ? '' : scene.heading == null ? '<circle cx="150" cy="150" r="6" fill="white" stroke="#283b2c" stroke-width="2"/>' : `<g transform="rotate(${scene.heading} 150 150)"><path d="M150 136L141 159L150 154L159 159Z" fill="white" stroke="#283b2c" stroke-width="2"/></g>`;
  const clip = widget.map?.shape === 'circle'
    ? '<circle cx="150" cy="150" r="150"/>'
    : '<rect width="300" height="300" rx="8"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
    <defs><clipPath id="map-clip">${clip}</clipPath></defs>
    <g opacity="${opacity}" clip-path="url(#map-clip)">
      <rect width="300" height="300" fill="#e6e9e2"/>
      <g transform="rotate(${scene.angle} 150 150)">
        ${images}<path d="${scene.path}" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round"/>${marker}
      </g>
      <g transform="translate(150 32) rotate(${scene.angle})">
        <path d="M0 -15L-5 -3H5Z" fill="#24392e"/>
        <text x="0" y="13" font-size="12" text-anchor="middle" fill="#24392e">N</text>
      </g>
    </g>
  </svg>`;
}
