<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRefs, watch } from "vue";
import { Info, Check, X } from "lucide-vue-next";
import { useEditorContext } from "../../editor/context";
const { messages } = useEditorContext();
const { notifications } = toRefs(messages);
const viewport = ref<HTMLElement>();
const host = shallowRef<HTMLElement | string>('body');
let observer: MutationObserver | undefined, revision = 0;
async function synchronize() {
  const current = ++revision;
  host.value = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1) ?? 'body';
  await nextTick();
  if (current !== revision) return;
  const element = viewport.value;
  if (!element) return;
  if (typeof element.showPopover === "function") {
    element.hidePopover();
    if (notifications.value.length) element.showPopover();
  } else element.removeAttribute('popover');
}
watch(() => notifications.value.map(item => item.id).join(','), synchronize, { flush: 'post' });
onMounted(() => {
  observer = new MutationObserver(synchronize);
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
  void synchronize();
});
onBeforeUnmount(() => { revision++; observer?.disconnect(); });
</script>
<template>
  <Teleport :to="host"><div ref="viewport" popover="manual" class="notification-stack" aria-label="通知">
    <TransitionGroup name="notification">
      <div v-for="item in notifications" :key="item.id" class="notification-card" :class="item.kind" :role="item.kind === 'error' ? 'alert' : 'status'">
        <Info v-if="item.kind === 'error'" :size="18" /><Check v-else :size="18" />
        <span>{{ item.message }}</span><button class="icon-button" aria-label="关闭通知" @click="messages.dismiss(item.id)"><X :size="16" /></button>
      </div>
    </TransitionGroup>
  </div></Teleport>
</template>
