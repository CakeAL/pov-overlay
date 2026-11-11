import { ref, watch } from 'vue';
import { useToast } from '@celestia-island/hikari/runtime';

export function useMessages() {
  const error = ref(''), notice = ref(''), warning = ref('');
  const toast = useToast();
  watch(error, message => { if (message) toast.error(message); }, { flush: 'sync' });
  watch(warning, message => { if (message) toast.warning(message); }, { flush: 'sync' });
  watch(notice, message => { if (message) toast.success(message); }, { flush: 'sync' });
  function clear() { error.value = ''; warning.value = ''; notice.value = ''; }
  function report(reason: unknown) {
    const message = reason instanceof Error ? reason.message : String(reason);
    if (error.value === message) toast.error(message);
    else error.value = message;
  }
  return { error, warning, notice, clear, report };
}
export type EditorMessages = ReturnType<typeof useMessages>;
