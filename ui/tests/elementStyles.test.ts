// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { ref } from 'vue';
import { defaultWidgets } from '../domain/types';
import { useWidgetLayout } from '../composables/useWidgetLayout';
import { SVG_EXAMPLES } from '../domain/svgExamples';
import { TELEMETRY_ITEMS } from '../domain/telemetryItems';
import { bindSvg } from '../domain/svgBindings';
import { sanitizeSvg } from '../infrastructure/svg';
const sample = { timestampMs: 0, latitude: -31, longitude: -121, elevation: 12, speedMps: 10, headingDeg: 90, segment: 0 };

test('new layouts start empty and clearing does not bring back default elements', () => {
  const layout = useWidgetLayout(ref(16 / 9), ref<HTMLElement>());
  expect(defaultWidgets()).toEqual([]);
  expect(layout.widgets.value).toEqual([]);
  expect(layout.selected.value).toBeUndefined();
  layout.resetLayout();
  expect(layout.widgets.value).toEqual([]);
  expect(layout.selectedId.value).toBe('');
});

test('navigation coordinates use two rows with hemisphere suffixes and keep raw fields compatible', () => {
  const item = TELEMETRY_ITEMS.find(item => item.key === 'coordinates')!;
  const svg = new DOMParser().parseFromString(bindSvg(sanitizeSvg(item.source).source, sample, 0, '#ffffff'), 'image/svg+xml');
  expect([...svg.querySelectorAll('text')].map(node => node.textContent)).toEqual(['31.000000° S', '121.000000° W']);
  expect(bindSvg(item.source, { ...sample, latitude: 0, longitude: 121 }, 0, '#ffffff')).toContain('0.000000° N');
  expect(bindSvg(item.source, null, 0, '#ffffff')).not.toMatch(/° [NSEW]/);
  expect(bindSvg('<text>{$Latitude} {$Longitude}</text>', sample, 0, '#ffffff')).toContain('-31.000000 -121.000000');
});

test('all catalog SVGs survive sanitizing and binding, including self-contained Minecraft textures', () => {
  for (const item of SVG_EXAMPLES) {
    const source = bindSvg(sanitizeSvg(item.source).source, sample, 0, '#ffffff');
    expect(source).not.toContain('{$');
    expect(new DOMParser().parseFromString(source, 'image/svg+xml').querySelector('parsererror')).toBeNull();
  }
  const compass = SVG_EXAMPLES.find(item => item.key === 'minecraftCompass')!;
  expect(sanitizeSvg(compass.source).source).toContain('data:image/png;base64,');
  for (const [headingDeg, offset] of [[0, 0], [90, -128], [180, -256], [270, -384], [360, 0], [359, 0]]) {
    expect(bindSvg(compass.source, { ...sample, headingDeg }, 0, '#fff')).toContain(`translate(${offset} 0)`);
  }
  expect(bindSvg(compass.source, null, 0, '#fff')).toContain('opacity="0"');
});
