<script setup lang="ts">
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
const { media } = useEditorContext();
const { track, busy } = toRefs(media);
</script>
<template>
  <div class="empty-stage">
    <div v-if="!track" class="empty-content">
      <HButton variant="ghost" size="sm" class="text-button" :disabled="busy" @click="media.chooseGpx">
        选择 GPX
      </HButton>
    </div>
  </div>
</template>
