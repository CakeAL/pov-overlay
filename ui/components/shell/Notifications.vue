<script setup lang="ts">
import { ref, toRefs, watch } from "vue";
import { Info, Check, X } from "lucide-vue-next";
import { useEditorContext } from "../../editor/context";
const { messages } = useEditorContext();
const { notifications } = toRefs(messages);
const viewport = ref<HTMLElement>();
watch(() => notifications.value.map(item => item.id).join(','), () => {
  const element = viewport.value;
  if (!element) return;
  if (typeof element.showPopover === "function") {
    element.hidePopover();
    if (notifications.value.length) element.showPopover();
  } else element.removeAttribute('popover');
}, { flush: "post" });
</script>
<template>
  <div ref="viewport" popover="manual" class="notification-stack" aria-label="通知">
    <TransitionGroup name="notification">
      <div v-for="item in notifications" :key="item.id" class="notification-card" :class="item.kind" :role="item.kind === 'error' ? 'alert' : 'status'">
        <Info v-if="item.kind === 'error'" :size="18" /><Check v-else :size="18" />
        <span>{{ item.message }}</span><button class="icon-button" aria-label="关闭通知" @click="messages.dismiss(item.id)"><X :size="16" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>
