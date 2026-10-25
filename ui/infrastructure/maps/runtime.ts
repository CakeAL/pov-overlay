export interface MapRuntimeSettings { mapDebounceMs: number; mapConcurrentRequests: number; amapMinIntervalMs: number }
let settings: MapRuntimeSettings = { mapDebounceMs: 180, mapConcurrentRequests: 2, amapMinIntervalMs: 500 };
export const mapRuntimeSettings = () => settings;
export function configureMapRuntime(value: MapRuntimeSettings) { settings = { ...value }; window.dispatchEvent(new Event('pov-map-settings-changed')); }
