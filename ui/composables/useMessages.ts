import { onBeforeUnmount, ref, watch } from "vue";
export interface Notification { id: number; kind: "error" | "notice"; message: string }
export function useMessages() {
  const error = ref(""), notice = ref("");
  const notifications = ref<Notification[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  let serial = 0;
  function dismiss(id: number) {
    const item = notifications.value.find(item => item.id === id);
    notifications.value = notifications.value.filter(item => item.id !== id);
    clearTimeout(timers.get(id)); timers.delete(id);
    if (item && (item.kind === "error" ? error : notice).value === item.message)
      (item.kind === "error" ? error : notice).value = "";
  }
  function notify(kind: Notification["kind"], message: string) {
    if (!message) return;
    const id = ++serial;
    notifications.value.push({ id, kind, message });
    timers.set(id, setTimeout(() => dismiss(id), kind === "error" ? 12000 : 6000));
    if (notifications.value.length > 5) dismiss(notifications.value[0]!.id);
  }
  watch(error, message => notify("error", message), { flush: "sync" });
  watch(notice, message => notify("notice", message), { flush: "sync" });
  function clear() { error.value = ""; notice.value = ""; }
  function report(reason: unknown) {
    const message = reason instanceof Error ? reason.message : String(reason);
    if (error.value === message) notify("error", message);
    else error.value = message;
  }
  onBeforeUnmount(() => timers.forEach(clearTimeout));
  return { error, notice, notifications, dismiss, clear, report };
}
export type EditorMessages = ReturnType<typeof useMessages>;
