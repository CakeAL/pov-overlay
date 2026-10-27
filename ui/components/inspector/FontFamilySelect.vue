<script setup lang="ts">
import HIconButton from "@celestia-island/hikari/components/HkIconButton.tsx";
import { computed, ref } from 'vue';
import { RefreshCw } from 'lucide-vue-next';
import HSearchInput from '@celestia-island/hikari/components/HkSearchInput.tsx';
import HSelect from '@celestia-island/hikari/components/HkSelect.tsx';
import { useEditorContext } from '../../editor/context';
const props = defineProps<{ modelValue?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [string | undefined] }>();
const { fonts } = useEditorContext();
const query = ref('');
const options = computed(() => [
  { value: '', label: '模板字体' },
  ...fonts.families.filter(name => name.toLocaleLowerCase().includes(query.value.toLocaleLowerCase())).map(name => ({ value: name, label: name })),
]);
function load() { if (!props.disabled) void fonts.load(); }
</script>
<template>
  <div class="font-picker" @focusin="load">
    <HSearchInput v-model="query" placeholder="搜索字体" :disabled="disabled" size="sm" />
    <div class="font-picker-actions">
      <HSelect panel-title="元素字体" :model-value="modelValue ?? ''" :placeholder="modelValue || '模板字体'" :disabled="disabled" :options="options" @update:model-value="emit('update:modelValue', $event || undefined)" />
      <HIconButton variant="ghost" :size="28" :disabled="disabled || fonts.busy" aria-label="刷新本机字体" title="刷新本机字体" @click="fonts.load(true)"><RefreshCw :size="16" :class="{ spinning: fonts.busy }" /></HIconButton>
    </div>
  </div>
</template>
