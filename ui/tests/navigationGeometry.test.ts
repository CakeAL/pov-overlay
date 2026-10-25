import { expect, test } from 'vitest';
import { routePreview } from '../domain/routePreview';
import { routeOverlay } from '../domain/routeOverlay';
import type { Track, Widget } from '../domain/types';
const track: Track = { name: '', startMs: 0, endMs: 2000, distanceMeters: 200, skippedPoints: 0, samples: [0, 1, 2].map(i => ({ timestampMs: i * 1000, latitude: 22 + i * .001, longitude: 113, speedMps: 1, elevation: null, segment: 0, headingDeg: 0 })) };
test('local route keeps the rider centered at both ends and preserves empty space', () => {
  for (const current of [track.samples[0]!, track.samples[2]!]) {
    const geometry = routePreview(track, 300, 300, 24, current);
    expect(geometry.point(current)).toEqual({ x: 150, y: 150 });
    const widget: Widget = { id: '', kind: 'route', label: '', x: 0, y: 0, scale: 1, opacity: 0, color: '#ffffff', visible: true, locked: false, route: { mode: 'local', headingUp: true } };
    expect(routeOverlay(widget, current, { track, timestampMs: current.timestampMs })).toContain('translate(150 150) rotate(0)');
  }
});

import { mapScene, mercator } from '../domain/mapOverlay';
import { mapCoordinate } from '../domain/mapCoordinates';
test('AMap static raster center and route share the 512-pixel zoom scale', () => {
  const widget: Widget = { id: '', kind: 'minimap', label: '', x: 0, y: 0, scale: 1, opacity: 0, color: '#ffffff', visible: true, locked: false, map: { provider: 'amap', zoom: 14 } };
  const a = { ...track.samples[0]!, latitude: 22.6, longitude: 113.83 };
  const b = { ...a, timestampMs: 1000, latitude: 22.605, longitude: 113.835 };
  const scene = mapScene(widget, a, { track: { ...track, samples: [a, b] }, timestampMs: 0 });
  const first = mapCoordinate(a.latitude, a.longitude, 'amap'), next = mapCoordinate(b.latitude, b.longitude, 'amap');
  const p = mercator(first.latitude, first.longitude, 14), q = mercator(next.latitude, next.longitude, 14);
  expect(scene.path).toContain(`L${(150+(q.x-p.x)*512).toFixed(1)},${(150+(q.y-p.y)*512).toFixed(1)}`);
  const raster = scene.raster!, anchor = mercator(raster.latitude, raster.longitude, 14);
  expect(raster.left + 256 + (p.x-anchor.x)*512).toBeCloseTo(150, 6);
  expect(raster.top + 256 + (p.y-anchor.y)*512).toBeCloseTo(150, 6);
});
