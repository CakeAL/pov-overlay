import { ref } from "vue";
export function useTelemetrySettings() {
  const smoothingSeconds = ref(3),
    refreshSeconds = ref(0.1);
  return { smoothingSeconds, refreshSeconds };
}
export type TelemetrySettings = ReturnType<typeof useTelemetrySettings>;
