<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import HMenu from '@celestia-island/hikari/components/HkMenu.tsx';
import { useEditorContext } from '../../editor/context';
const { widgetMenu } = useEditorContext();
const { targetId, x, y } = toRefs(widgetMenu);
const anchor = ref<HTMLElement>();
const open = computed({ get: () => !!targetId.value, set: value => { if (!value) widgetMenu.close(); } });
const items = [{ key: 'delete', label: '删除元素', icon: Trash2, danger: true }];
watch(targetId, id => { if (id) anchor.value?.focus({ preventScroll: true }); }, { flush: 'post' });
</script>
<template>
  <Teleport to="body"><span v-show="open" ref="anchor" class="context-menu-anchor" tabindex="-1" :style="{ left: `${x}px`, top: `${y}px` }" @keydown.delete.prevent.stop="widgetMenu.remove" @keydown.backspace.prevent.stop="widgetMenu.remove" @keydown.esc.prevent.stop="widgetMenu.close" /></Teleport>
  <HMenu :key="`${targetId}-${x}-${y}`" v-model:open="open" title="画布元素菜单" :items="items" :anchor-ref="anchor" @select="widgetMenu.remove" />
</template>
