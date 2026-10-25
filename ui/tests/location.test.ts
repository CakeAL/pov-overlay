import { expect, test } from 'vitest';
import { locationQuery } from '../domain/location';
import { bindSvg } from '../domain/svgBindings';
import type { Sample, Track } from '../domain/types';
test('address queries use only the same segment behind the rider and stop in gaps', () => {
  const samples: Sample[] = [0,1,2,3].map(i => ({ timestampMs: i*1000, latitude: 22.6 + i*.0003, longitude: 113.83, elevation: null, speedMps: 10, distanceMeters: i*30, segment: i===3 ? 1 : 0 }));
  const track: Track = { name: '', samples, startMs: 0, endMs: 3000, distanceMeters: 90, skippedPoints: 0 };
  expect(locationQuery(samples[2]!, { track })?.approach).not.toBeNull();
  expect(locationQuery(samples[3]!, { track })?.approach).toBeNull();
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
