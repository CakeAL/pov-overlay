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
