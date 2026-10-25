import { ref } from 'vue';
import { FONT_FAMILIES, validFontFamily } from '../domain/widgetTypography';
import { systemFontFamilies } from '../infrastructure/fonts';
import type { EditorMessages } from './useMessages';
export function useSystemFonts(messages: EditorMessages) {
  const families = ref([...FONT_FAMILIES]), busy = ref(false), loaded = ref(false);
  async function load(refresh = false) {
    if (busy.value || (loaded.value && !refresh)) return;
    busy.value = true;
    try {
      const names = await systemFontFamilies();
      families.value = [...new Set([...FONT_FAMILIES, ...names.filter(validFontFamily)])].sort((a,b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
      loaded.value = true;
    } catch (reason) { messages.report(reason); }
    finally { busy.value = false; }
  }
  return { families, busy, load };
}
