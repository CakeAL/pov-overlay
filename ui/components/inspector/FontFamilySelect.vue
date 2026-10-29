<script setup lang="ts">
import HIconButton from '@celestia-island/hikari/components/HkIconButton.tsx';
import HButton from '@celestia-island/hikari/components/HkButton.tsx';
import HSearchInput from '@celestia-island/hikari/components/HkSearchInput.tsx';
import HSelectPanel from '@celestia-island/hikari/components/HkSelectPanel.tsx';
import HMenu from '@celestia-island/hikari/components/HkMenu.tsx';
import { computed, ref, watch } from 'vue';
import { RefreshCw, ChevronDown } from 'lucide-vue-next';
import { useEditorContext } from '../../editor/context';
const props = defineProps<{ modelValue?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [string | undefined] }>();
const { fonts } = useEditorContext();
const query = ref(''), opened = ref(false), anchor = ref<HTMLElement>();
const options = computed(() => [
  { key: '', label: '模板字体', checked: !props.modelValue },
  ...fonts.families.filter(name => name.toLocaleLowerCase().includes(query.value.toLocaleLowerCase())).map(name => ({ key: name, label: name, checked: name === props.modelValue })),
]);
watch(opened, value => { if (value) { query.value = ''; void fonts.load(); } });
watch(() => props.disabled, value => { if (value) opened.value = false; });
function select(key: string) { emit('update:modelValue', key || undefined); opened.value = false; }
</script>
<template>
  <div class="font-picker-actions">
    <span ref="anchor" class="font-picker-trigger"><HButton variant="outline" :disabled="disabled" aria-label="选择或搜索字体" :aria-expanded="opened" @click="opened = !opened">{{ modelValue || '模板字体' }}<ChevronDown :size="16" /></HButton></span>
    <HIconButton variant="ghost" :size="28" :disabled="disabled || fonts.busy" aria-label="刷新本机字体" title="刷新本机字体" @click="fonts.load(true)"><RefreshCw :size="16" :class="{ spinning: fonts.busy }" /></HIconButton>
    <HSelectPanel v-model:open="opened" :anchor-ref="anchor ?? null" title="元素字体" max-height="min(28rem, 60dvh)">
      <div class="font-picker-panel">
        <HSearchInput v-model="query" placeholder="搜索字体" aria-label="搜索字体" size="sm" />
        <HMenu variant="sidebar" :open="opened" :items="options" :active-key="modelValue ?? ''" @select="select" />
      </div>
    </HSelectPanel>
  </div>
</template>
