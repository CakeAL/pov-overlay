import { TELEMETRY_ITEMS } from './telemetryItems';
export const ELEMENT_CATEGORIES = [
  { key: 'motion', label: '运动', items: ['speed', 'elevation'] },
  { key: 'position', label: '位置', items: ['heading', 'coordinates', 'distance'] },
  { key: 'time', label: '时间', items: ['elapsed'] },
] as const;
export const catalogItems = (category: string) => {
  const keys: readonly string[] = ELEMENT_CATEGORIES.find(item => item.key === category)?.items ?? [];
  return TELEMETRY_ITEMS.filter(item => keys.includes(item.key));
};
