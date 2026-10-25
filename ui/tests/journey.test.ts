import { expect, it } from 'vitest';
import { overlayContext } from '../domain/overlayContext';
import type { Track } from '../domain/types';
it('keeps known distance while time progresses through gaps and supports seeking before and after a track', () => {
  const track: Track = { name: 'test', startMs: 1000, endMs: 60000, distanceMeters: 200, skippedPoints: 0, samples: [1000, 2000, 60000].map((timestampMs, i) => ({ timestampMs, latitude: 0, longitude: 0, speedMps: 0, elevation: null, segment: i === 2 ? 1 : 0, distanceMeters: i * 100 })) };
  expect(overlayContext(track, 30000, null).progress).toMatchObject({ distanceMeters: 100, remainingMeters: 100, remainingSeconds: 30 });
  expect(overlayContext(track, 40000, null).progress!.fraction).toBeGreaterThan(overlayContext(track, 30000, null).progress!.fraction);
  expect(overlayContext(track, 40000, null).progress!.remainingSeconds).toBe(20);
  expect(overlayContext(track, 0, null).progress).toMatchObject({ distanceMeters: 0, remainingMeters: 200, remainingSeconds: 59 });
  expect(overlayContext(track, 90000, null).progress).toMatchObject({ distanceMeters: 200, remainingMeters: 0, remainingSeconds: 0 });
});
