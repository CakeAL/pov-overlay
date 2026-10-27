// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import { provideEditor } from '../editor/context';
import type { Editor } from '../editor/createEditor';
import AppHeader from '../components/shell/AppHeader.vue';
import SavePresetDialog from '../components/shell/SavePresetDialog.vue';
import ExportDialog from '../components/export/ExportDialog.vue';
import WidgetPropertiesPanel from '../components/inspector/WidgetPropertiesPanel.vue';
import Notifications from '../components/shell/Notifications.vue';
import { useToast } from '@celestia-island/hikari/runtime';

const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.splice(0).forEach(stop => stop());
  const toast = useToast();
  [...toast.toasts].forEach(item => toast.remove(item.id));
  vi.unstubAllGlobals();
});
function mount() {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  let editor!: Editor;
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ setup() {
    editor = provideEditor();
    return () => h('div', [h(AppHeader), h(WidgetPropertiesPanel), h(SavePresetDialog), h(ExportDialog), h(Notifications)]);
  } });
  app.mount(host);
  cleanup.push(() => { app.unmount(); host.remove(); });
  return { editor, host };
}
async function settle() { await nextTick(); await nextTick(); }

function button(root: ParentNode, name: string) {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find(el => el.textContent?.trim() === name)!;
}

test('Hikari number steppers and keyboard sliders update layout with undo and respect locks', async () => {
  const { editor, host } = mount();
  const initial = editor.layout.selected!.x;
  const field = host.querySelector<HTMLElement>('[aria-label="元素 X 位置（百分比）"]')!;
  field.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  field.querySelector<HTMLButtonElement>('.hk-number-input-step-up')!.click();
  await settle();
  expect(editor.layout.selected!.x).toBeCloseTo(initial + 0.0001);
  editor.layout.undo();
  await settle();
  expect(editor.layout.selected!.x).toBe(initial);
  const slider = host.querySelector<HTMLElement>('[role="slider"][aria-label="元素大小"]')!;
  slider.focus();
  slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await settle();
  expect(editor.layout.selected!.scale).toBeCloseTo(1.001);
  expect(editor.layout.selected!.x).toBe(initial);
  editor.layout.undo();
  expect(editor.layout.selected!.scale).toBe(1);
  editor.layout.toggleLock(editor.layout.selected!);
  await settle();
  expect(field.querySelector<HTMLInputElement>('input')!.disabled).toBe(true);
  expect(slider.getAttribute('aria-disabled')).toBe('true');
});

test('the Hikari file menu opens the preset modal and nested dropdown Escape closes only its own layer', async () => {
  const { editor, host } = mount();
  button(host, '文件').click();
  await settle();
  const save = [...document.querySelectorAll<HTMLElement>('.hk-menu-row')].find(el => el.textContent?.includes('保存预设'))!;
  save.click();
  await settle();
  expect(editor.documents.saveOpen).toBe(true);
  const name = document.querySelector<HTMLInputElement>('[aria-label="预设名称"]')!;
  expect(name.closest('[role="dialog"]')).not.toBeNull();
  name.value = '骑行模板';
  name.dispatchEvent(new Event('input', { bubbles: true }));
  await settle();
  expect(editor.documents.draftName).toBe('骑行模板');
  name.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await settle();
  expect(editor.documents.saveOpen).toBe(false);
  editor.videoExport.open = true;
  await settle();
  const modal = document.querySelector<HTMLElement>('.overlay-export-modal')!;
  const select = modal.querySelector<HTMLButtonElement>('.hk-select-trigger')!;
  select.click();
  await settle();
  const panel = document.querySelector<HTMLElement>('.hk-select-popout')!;
  panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await settle();
  expect(editor.videoExport.open).toBe(true);
  editor.videoExport.busy = true;
  await settle();
  expect([...modal.querySelectorAll<HTMLButtonElement>('button')].filter(el => el.classList.contains('hk-select-trigger')).every(el => el.disabled)).toBe(true);
  expect(button(modal, '取消导出')?.disabled).toBe(false);
});

test('errors use the native Hikari toast and can be dismissed', async () => {
  const { editor } = mount();
  editor.messages.report(new Error('地址查询失败'));
  await settle();
  const toast = document.querySelector<HTMLElement>('.hk-toast-item[role="alert"]')!;
  expect(toast.textContent).toContain('地址查询失败');
  toast.querySelector<HTMLButtonElement>('.hk-toast-close')!.click();
  await settle();
  expect(useToast().toasts).toHaveLength(0);
});
