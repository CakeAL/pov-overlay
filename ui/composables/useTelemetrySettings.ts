import { ref } from "vue";
export function useTelemetrySettings() {
  const smoothingSeconds = ref(3),
    refreshSeconds = ref(0.1),
    stopThresholdKmh = ref(0.5);
  return { smoothingSeconds, refreshSeconds, stopThresholdKmh };
}
export type TelemetrySettings = ReturnType<typeof useTelemetrySettings>;
