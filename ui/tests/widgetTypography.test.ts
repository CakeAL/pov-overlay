// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { styleWidgetSvg } from '../domain/widgetTypography';
test('font choices override template inline important styles without changing other typography', () => {
  const source = '<svg xmlns="http://www.w3.org/2000/svg"><style>text{font-family:serif!important}</style><text style="font-family:serif!important;fill:red;font-weight:600" font-size="40">Hello<tspan style="font-family:serif!important" font-size="20">km/h</tspan></text></svg>';
  const output = styleWidgetSvg(source, { fontFamily: 'Arial', fontSize: 80 });
  const doc = new DOMParser().parseFromString(output, 'image/svg+xml');
  expect(doc.querySelector('parsererror')).toBeNull();
  for (const text of doc.querySelectorAll('text,tspan')) {
    expect(text.getAttribute('style')).toContain('font-family:"Arial",sans-serif!important');
    expect(text.getAttribute('style')).not.toContain('font-family:serif');
  }
  expect(doc.querySelector('text')!.getAttribute('style')).toContain('font-weight:600');
  expect(doc.querySelector('text')!.getAttribute('style')).toContain('fill:red');
  expect(doc.querySelector('text')!.getAttribute('font-size')).toBe('80');
  expect(doc.querySelector('tspan')!.getAttribute('font-size')).toBe('40');
});
