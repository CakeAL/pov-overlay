<script setup lang="ts">
import { Info, Check, X } from "lucide-vue-next";
defineProps<{ kind: "error" | "notice"; message: string }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <div
    v-if="message"
    class="message-banner"
    :class="kind"
    :role="kind === 'error' ? 'alert' : 'status'"
  >
    <Info v-if="kind === 'error'" :size="16" /><Check
      v-else
      :size="16"
    /><span>{{ message }}</span
    ><button
      :aria-label="kind === 'error' ? '关闭错误提示' : '关闭提示'"
      @click="$emit('close')"
    >
      <X :size="15" />
    </button>
  </div>
</template>
