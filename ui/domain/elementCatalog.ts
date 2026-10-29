import { ALL_TELEMETRY_ITEMS } from './telemetryItems';
export const ELEMENT_CATEGORIES = [
  { key: 'motion', label: '运动', items: ['speed', 'elevation'] },
  { key: 'journey', label: '行程', items: ['currentDistance', 'remainingDistance', 'remainingTime', 'totalDistance', 'totalTime', 'progress'] },
  { key: 'navigation', label: '导航', items: ['heading', 'coordinates'] },
  { key: 'location', label: '地点', items: ['province', 'city', 'district', 'street', 'road', 'roadInfo'] },
  { key: 'time', label: '时间', items: ['elapsed'] },
] as const;
export const catalogItems = (category: string) => {
  const keys: readonly string[] = ELEMENT_CATEGORIES.find(item => item.key === category)?.items ?? [];
  return ALL_TELEMETRY_ITEMS.filter(item => keys.includes(item.key));
};
