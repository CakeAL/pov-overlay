import { expect, test } from 'vitest';
import { locationQuery } from '../domain/location';
import { bindSvg } from '../domain/svgBindings';
import type { Sample, Track } from '../domain/types';
test('address queries use only the same segment behind the rider and stop in gaps', () => {
  const samples: Sample[] = [0,1,2,3].map(i => ({ timestampMs: i*1000, latitude: 22.6 + i*.0003, longitude: 113.83, elevation: null, speedMps: 10, distanceMeters: i*30, segment: i===3 ? 1 : 0 }));
  const track: Track = { name: '', samples, startMs: 0, endMs: 3000, distanceMeters: 90, skippedPoints: 0 };
  expect(locationQuery(samples[2]!, { track }, 1)?.approach).not.toBeNull();
  expect(locationQuery(samples[3]!, { track })).toBeNull(); // Isolated point has no continuous coverage.
  expect(locationQuery(null, { track })).toBeNull();
});
test('address names cannot inject SVG markup and missing names remain missing', () => {
  const source = '<svg><text>{$Province} {$Road}</text></svg>';
  const address = { province: '广东省', city: '', district: '', street: '', road: '<path onload="attack"/>&' };
  const bound = bindSvg(source, null, 0, '#ffffff', { address });
  expect(bound).toContain('广东省');
  expect(bound).toContain('&lt;path onload=&quot;attack&quot;/&gt;&amp;');
  expect(bound).not.toContain('<path');
  expect(bindSvg(source, null, 0, '#ffffff')).toContain('— —');
});

test('junction approach stays before the crossing even near its far edge', () => {
  // Junction at 100m, current position at 130m: a 40m lookback would still be inside it.
  const samples: Sample[] = [0, 100, 200].map(distance => ({ timestampMs: distance * 100, latitude: 22.6 + distance / 111320, longitude: 113.83, elevation: null, speedMps: 10, distanceMeters: distance, segment: 0 }));
  const track: Track = { name: '', samples, startMs: 0, endMs: 20000, distanceMeters: 200, skippedPoints: 0 };
  const result = locationQuery(samples[1]!, { track, timestampMs: 13000 }, 1)!;
  expect(result.approach).not.toBeNull();
  expect(result.approach!.latitude).toBeCloseTo(Math.round((22.6 + 50 / 111320) * 5000) / 5000, 8);
});

test('address cadence is deterministic across seeks and independent of telemetry snapshots', () => {
  const samples: Sample[] = [0, 10, 12, 20, 60, 70].map((seconds, index) => ({ timestampMs: 100000 + seconds * 1000, latitude: 22.6 + index * .01, longitude: 113.83, elevation: null, speedMps: 10, distanceMeters: index * 100, segment: index < 2 ? 0 : 1 }));
  const track: Track = { name: '', samples, startMs: 100000, endMs: 170000, distanceMeters: 500, skippedPoints: 0 };
  const at = (seconds: number, interval = 5) => locationQuery(samples[0]!, { track, timestampMs: 100000 + seconds * 1000 }, interval);
  expect(at(4.9)).toEqual(at(0));
  expect(at(5)).not.toEqual(at(4.9));
  expect(at(9.9)).toEqual(at(5));
  const soughtBack = at(5);
  at(9.9);
  expect(at(5)).toEqual(soughtBack);
  expect(at(11)).toBeNull(); // Explicit segment break.
  expect(at(12)?.latitude).toBe(samples[2]!.latitude);
  expect(at(16.9)).toEqual(at(12));
  expect(at(17)).not.toEqual(at(12));
  expect(at(40)).toBeNull(); // >30-second gap even with unchanged segment ID.
  expect(at(60)?.latitude).toBe(samples[4]!.latitude);
  expect(at(64.9)).toEqual(at(60));
  expect(at(65)).not.toEqual(at(60));
  expect(at(60)?.approach).toBeNull(); // Do not borrow approach across a long gap.
  expect(at(4, 1)).not.toEqual(at(4, 5));
  expect(locationQuery(null, { track, timestampMs: 105000 })).toBeNull();
});
