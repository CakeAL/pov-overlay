import { ref } from "vue";

export function useMessages() {
  const error = ref("");
  const notice = ref("");
  function clear() {
    error.value = "";
    notice.value = "";
  }
  function report(reason: unknown) {
    error.value = reason instanceof Error ? reason.message : String(reason);
  }
  return { error, notice, clear, report };
}
export type EditorMessages = ReturnType<typeof useMessages>;
