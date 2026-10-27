import { ref, watch } from 'vue';
import { useToast } from '@celestia-island/hikari/runtime';

export function useMessages() {
  const error = ref(''), notice = ref('');
  const toast = useToast();
  watch(error, message => { if (message) toast.error(message); }, { flush: 'sync' });
  watch(notice, message => { if (message) toast.success(message); }, { flush: 'sync' });
  function clear() { error.value = ''; notice.value = ''; }
  function report(reason: unknown) {
    const message = reason instanceof Error ? reason.message : String(reason);
    if (error.value === message) toast.error(message);
    else error.value = message;
  }
  return { error, notice, clear, report };
}
export type EditorMessages = ReturnType<typeof useMessages>;
