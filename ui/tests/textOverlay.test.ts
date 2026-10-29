// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { createApp, h, nextTick, ref } from 'vue';
import { textOverlaySource, MAX_TEXT_LENGTH, MAX_TEXT_LINES } from '../domain/textOverlay';
import { hasLocationFields } from '../domain/location';
import { widgetSvg } from '../domain/widgetSvg';
import { widgetAspect } from '../domain/widgetGeometry';
import { useWidgetLayout } from '../composables/useWidgetLayout';
import { useSvgElements } from '../composables/useSvgElements';
import { useMessages } from '../composables/useMessages';
import { parseDocument, validateWidgets } from '../infrastructure/documents/schema';
import { renderWidgetSvg } from '../infrastructure/renderWidget';
import { lookupLocation } from '../infrastructure/maps/geocoding';
import { provideEditor } from '../editor/context';
import type { Editor } from '../editor/createEditor';
import TextProperties from '../components/inspector/TextProperties.vue';

vi.mock('../infrastructure/maps/geocoding', () => ({
  lookupLocation: vi.fn(async () => ({ province: '广东省', city: '深圳市', district: '宝安区', street: '新安街道', road: '宝安大道' })),
  addressForFrame: vi.fn(async (sample) => sample ? lookupLocation({ ...sample, approach: null }) : null),
  retryLocation: vi.fn(), clearLocationCache: vi.fn(),
}));
const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).forEach(stop => stop()); vi.unstubAllGlobals(); vi.clearAllMocks(); });
function setup() {
  const layout = useWidgetLayout(ref(16 / 9), ref<HTMLElement>());
  layout.widgets.value = [];
  let elements!: ReturnType<typeof useSvgElements>;
  const host = document.createElement('div');
  const app = createApp({ setup() { elements = useSvgElements(layout, useMessages()); return () => null; } });
  app.mount(host);
  cleanup.push(() => app.unmount());
  elements.addText();
  return { layout, elements };
}

test('editable text shares address bindings with preview and export, without networking for plain text or gaps', async () => {
  const { layout, elements } = setup();
  elements.updateText('{$Province} {$City} {$District}\n道路：{$Road} · {$Speed} km/h');
  const widget = layout.selected.value!;
  expect(hasLocationFields(widget)).toBe(true);
  const sample = { latitude: 22.6, longitude: 113.83, timestampMs: 1000, speedMps: 10, elevation: null, segment: 0 };
  const exported = await renderWidgetSvg(widget, sample, 1, 16 / 9);
  expect(exported).toContain('广东省 深圳市 宝安区');
  expect(exported).toContain('道路：宝安大道 · 36.0 km/h');
  expect(exported).toBe(widgetSvg(widget, sample, 1, 16 / 9, { address: await lookupLocation({ ...sample, approach: null }) }));
  vi.mocked(lookupLocation).mockClear();
  expect(await renderWidgetSvg(widget, null, 2, 16 / 9)).toContain('道路：— · — km/h');
  expect(lookupLocation).not.toHaveBeenCalled();
  elements.updateText('速度 {$Speed} km/h');
  expect(hasLocationFields(widget)).toBe(false);
  await renderWidgetSvg(widget, sample, 1, 16 / 9);
  expect(lookupLocation).not.toHaveBeenCalled();
});

test('text edits support undo, redo and locking, and persist without trusting serialized SVG', () => {
  const { layout, elements } = setup();
  const initial = layout.selected.value!.svg!.textTemplate;
  const template = '位置 <script>alert(1)</script> & "路"\n{$District} / {$Road}';
  elements.updateText(template);
  expect(layout.selected.value!.svg!.source).not.toContain('<script>');
  layout.undo();
  expect(layout.selected.value!.svg!.textTemplate).toBe(initial);
  layout.redo();
  expect(layout.selected.value!.svg!.textTemplate).toBe(template);
  layout.selected.value!.locked = true;
  expect(elements.updateText('不能修改')).toBe(false);
  const widgets = JSON.parse(JSON.stringify(layout.widgets.value));
  widgets[0].svg.source = '<svg onload="attack()"><script>attack()</script></svg>';
  const restored = parseDocument(JSON.stringify({ type: 'pov-overlay/preset', version: 1, name: '地址', widgets, smoothingPoints: 7, refreshSeconds: 0.2, aspectRatio: 16 / 9 }), 'preset').widgets[0]!;
  expect(restored.svg!.textTemplate).toBe(template);
  expect(restored.svg!.source).not.toContain('attack()');
  const doc = new DOMParser().parseFromString(widgetSvg(restored, null, 0, 16 / 9), 'image/svg+xml');
  expect(doc.querySelector('parsererror, script')).toBeNull();
  expect(doc.querySelector('text')?.textContent).toBe('位置 <script>alert(1)</script> & "路"');
});

test('text validates size, line count and fields at edit and restore boundaries; long lines fit the box', () => {
  const { layout, elements } = setup();
  const original = layout.selected.value!.svg!.textTemplate;
  expect(elements.updateText('{$Unknown}')).toBe(false);
  expect(layout.selected.value!.svg!.textTemplate).toBe(original);
  for (const invalid of ['a'.repeat(MAX_TEXT_LENGTH + 1), '\n'.repeat(MAX_TEXT_LINES), '\u0000']) {
    expect(() => textOverlaySource(invalid)).toThrow();
    const widgets = JSON.parse(JSON.stringify(layout.widgets.value));
    widgets[0].svg.textTemplate = invalid;
    expect(() => validateWidgets(widgets)).toThrow();
  }
  elements.updateText('很长的道路名称'.repeat(10));
  expect(widgetSvg(layout.selected.value!, null, 0, 16 / 9)).toContain('textLength="768"');
  elements.updateText('短路名');
  expect(widgetSvg(layout.selected.value!, null, 0, 16 / 9)).not.toContain('textLength');
});

test('changing text font size keeps every line within the SVG and layout bounds', () => {
  const { layout, elements } = setup();
  elements.updateText('第一行\n{$Road}\n第三行');
  const widget = layout.selected.value!;
  widget.typography = { fontSize: 80, bold: true };
  layout.clampWidget(widget);
  const source = widgetSvg(widget, null, 0, 16 / 9);
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const [,, width, height] = doc.documentElement.getAttribute('viewBox')!.split(' ').map(Number);
  expect(widgetAspect(widget)).toBe(width! / height!);
  expect([...doc.querySelectorAll('text')].every(text => Number(text.getAttribute('y')) < height!)).toBe(true);
  const size = layout.dimensions(widget);
  expect(widget.x + size.width).toBeLessThanOrEqual(1);
  expect(widget.y + size.height).toBeLessThanOrEqual(1);
});

test('the property editor inserts parameters at the caret and preserves multiline text through selection and undo', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  let editor!: Editor;
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ setup() { editor = provideEditor(); return () => h(TextProperties); } });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  editor.svgElements.addText();
  await nextTick();
  const input = host.querySelector('textarea')!;
  input.value = '道路：\n速度：';
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await nextTick();
  input.focus();
  input.setSelectionRange(3, 3);
  const select = host.querySelector<HTMLButtonElement>('.hk-select-trigger')!;
  select.click();
  await nextTick();
  const road = [...document.querySelectorAll<HTMLElement>('.hk-select-option')].find(item => item.textContent?.includes('{$Road}'))!;
  road.click();
  await nextTick();
  expect(input.value).toBe('道路：{$Road}\n速度：');
  expect(input.selectionStart).toBe(10);
  expect(document.activeElement).toBe(input);
  editor.layout.undo();
  await nextTick();
  expect(input.value).toBe('道路：\n速度：');
  editor.layout.toggleLock(editor.layout.selected!);
  await nextTick();
  expect(input.disabled).toBe(true);
  expect(select.disabled).toBe(true);
});

test("each text line keeps its own size through binding, fitting, export, history and preset restore", async () => {
  const { layout, elements } = setup();
  elements.updateText("道路".repeat(35) + "\n{$Speed} km/h");
  layout.selected.value!.typography = { fontSize: 40 };
  elements.updateTextLineSize(0, 64);
  elements.updateTextLineSize(1, 18);
  const w = layout.selected.value!;
  const source = widgetSvg(w, null, 0, 16 / 9);
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const lines = [...doc.querySelectorAll("text")];
  expect(lines.map((line) => line.getAttribute("font-size"))).toEqual([
    "64",
    "18",
  ]);
  expect(lines[0]!.getAttribute("textLength")).toBe("768");
  expect(lines[1]!.getAttribute("textLength")).toBeNull();
  expect(Number(lines[1]!.getAttribute("y"))).toBeGreaterThan(
    Number(lines[0]!.getAttribute("y")) + 18,
  );
  expect(await renderWidgetSvg(w, null, 0, 16 / 9)).toBe(source);
  expect(
    validateWidgets(JSON.parse(JSON.stringify([w])))[0]!.svg!.lineFontSizes,
  ).toEqual([64, 18]);
  layout.undo();
  expect(layout.selected.value!.svg!.lineFontSizes).toEqual([64]);
  layout.redo();
  expect(layout.selected.value!.svg!.lineFontSizes).toEqual([64, 18]);
  elements.updateTextLineSize(1, null);
  expect(layout.selected.value!.svg!.lineFontSizes).toEqual([64, null]);
  elements.updateText("one");
  expect(layout.selected.value!.svg!.lineFontSizes).toEqual([64]);
  layout.selected.value!.locked = true;
  elements.updateTextLineSize(0, 90);
  expect(layout.selected.value!.svg!.lineFontSizes).toEqual([64]);
  for (const bad of [[0], [201], Array(21).fill(20), "bad"])
    expect(() =>
      validateWidgets([{ ...w, svg: { ...w.svg, lineFontSizes: bad } }]),
    ).toThrow();
});
