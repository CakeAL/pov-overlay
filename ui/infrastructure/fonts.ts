import { invoke } from '@tauri-apps/api/core';
import { native } from './media';
import { FONT_FAMILIES } from '../domain/widgetTypography';
export async function systemFontFamilies(): Promise<string[]> {
  if (native) return invoke<string[]>('list_system_fonts');
  const query = (window as Window & { queryLocalFonts?: () => Promise<{ family: string }[]> }).queryLocalFonts;
  if (query) return (await query.call(window)).map(font => font.family);
  return [...FONT_FAMILIES];
}
