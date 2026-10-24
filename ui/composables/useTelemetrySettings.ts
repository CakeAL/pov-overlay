import { ref } from "vue";
import { DEFAULT_SMOOTHING_POINTS } from "../domain/speedEstimation";
export function useTelemetrySettings() {
  const smoothingPoints = ref(DEFAULT_SMOOTHING_POINTS),
    refreshSeconds = ref(0.1),
    stopThresholdKmh = ref(0.5);
  return { smoothingPoints, refreshSeconds, stopThresholdKmh };
}
export type TelemetrySettings = ReturnType<typeof useTelemetrySettings>;
