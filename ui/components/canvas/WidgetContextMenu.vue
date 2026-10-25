<script setup lang="ts">
import { ref, toRefs, watch } from "vue";
import { Trash2 } from "lucide-vue-next";
import { useEditorContext } from "../../editor/context";
const { widgetMenu } = useEditorContext();
const { targetId, x, y } = toRefs(widgetMenu);
const menu = ref<HTMLElement>();
watch(() => [targetId.value, x.value, y.value], () => {
  const element = menu.value;
  if (!element) return;
  if (targetId.value) { if (!element.matches(':popover-open')) element.showPopover(); element.querySelector('button')?.focus(); }
  else element.hidePopover();
}, { flush: 'post' });
function toggled(event: Event) { if ((event as ToggleEvent).newState === 'closed') widgetMenu.close(); }
</script>
<template>
  <Teleport to="body"><div ref="menu" popover="auto" class="widget-context-menu" role="menu" aria-label="画布元素菜单" :style="{ left: `${x}px`, top: `${y}px` }" @toggle="toggled" @contextmenu.prevent @keydown.stop @keydown.delete.prevent="widgetMenu.remove" @keydown.backspace.prevent="widgetMenu.remove" @keydown.arrow-down.prevent="menu?.querySelector('button')?.focus()" @keydown.arrow-up.prevent="menu?.querySelector('button')?.focus()">
    <button role="menuitem" @click="widgetMenu.remove"><Trash2 :size="15" />删除元素<kbd>⌫</kbd></button>
  </div></Teleport>
</template>
