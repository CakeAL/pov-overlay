import type { Widget } from './types';
export const FONT_FAMILIES = ['sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'PingFang SC', 'Microsoft YaHei', 'Georgia', 'Menlo'];
/** Apply after field binding; preserve relative sizes between values and units. */
export function styleWidgetSvg(source: string, typography: Widget['typography']): string {
  if (!typography) return source;
  const family = /^[\w ,.-]{1,120}$/.test(typography.fontFamily ?? '') ? typography.fontFamily : undefined;
  const sizes = [...source.matchAll(/font-size\s*(?:=\s*["']|:\s*)([\d.]+)/gi)].map(m => Number(m[1])).filter(n => n > 0 && Number.isFinite(n));
  const base = Math.max(32, ...sizes);
  if (typography.fontSize != null) {
    const factor = typography.fontSize / (sizes.length ? Math.max(...sizes) : base);
    source = source.replace(/(font-size\s*(?:=\s*["']|:\s*))([\d.]+)/gi, (_, prefix: string, n: string) => `${prefix}${Number(n) * factor}`);
  }
  const rules = [family && `font-family:${family}!important`, typography.bold != null && `font-weight:${typography.bold ? 700 : 400}!important`, typography.italic != null && `font-style:${typography.italic ? 'italic' : 'normal'}!important`, !sizes.length && typography.fontSize != null && `font-size:${typography.fontSize}px`].filter(Boolean).join(';');
  return source.replace(/(<svg\b[^>]*>)/, `$1<style>text,tspan{${rules}}</style>`);
}
