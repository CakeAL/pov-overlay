<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue';
import { ChevronDown, RefreshCw } from 'lucide-vue-next';
import { useEditorContext } from '../../editor/context';
const props = defineProps<{ modelValue?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [string | undefined] }>();
const { fonts } = useEditorContext();
const query = ref(props.modelValue ?? ''), open = ref(false), active = ref(0), input = ref<HTMLInputElement>();
const id = useId();
const options = computed(() => [{ name: '模板字体', value: '' }, ...fonts.families.map(name => ({ name, value: name }))].filter(font => !query.value || font.name.toLocaleLowerCase().includes(query.value.toLocaleLowerCase())));
watch(() => props.modelValue, value => { query.value = value ?? ''; });
watch(query, () => { active.value = 0; });
function show() { if (!props.disabled) { open.value = true; void fonts.load(); } }
function close(event: FocusEvent) { if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) { open.value = false; query.value = props.modelValue ?? ''; } }
function choose(value: string) { emit('update:modelValue', value || undefined); query.value = value; open.value = false; }
async function move(amount: number) {
  show(); active.value = Math.max(0, Math.min(options.value.length - 1, active.value + amount));
  await nextTick(); document.getElementById(`${id}-${active.value}`)?.scrollIntoView({ block: 'nearest' });
}
function accept() { if (open.value && options.value[active.value]) choose(options.value[active.value]!.value); }
function escape() { open.value = false; query.value = props.modelValue ?? ''; }
</script>
<template>
  <div class="font-picker" @focusout="close">
    <div class="font-picker-input"><input ref="input" aria-label="元素字体" role="combobox" aria-autocomplete="list" :aria-expanded="open" :aria-controls="id" :aria-activedescendant="open && options.length ? `${id}-${active}` : undefined" :disabled="disabled" v-model="query" placeholder="搜索字体" autocomplete="off" maxlength="256" @focus="show(); input?.select()" @input="show" @keydown.arrow-down.prevent.stop="move(1)" @keydown.arrow-up.prevent.stop="move(-1)" @keydown.enter.prevent.stop="accept" @keydown.esc.prevent.stop="escape" />
      <button type="button" :disabled="disabled" aria-label="展开字体列表" @click="input?.focus(); query = ''; show()"><ChevronDown :size="15" /></button></div>
    <div v-if="open" class="font-picker-menu"><div :id="id" role="listbox" aria-label="可用字体"><button v-for="(font, index) in options" :id="`${id}-${index}`" :key="font.value" type="button" role="option" tabindex="-1" :aria-selected="modelValue === font.value || (!modelValue && !font.value)" :class="{ focused: active === index }" @mouseenter="active = index" @mousedown.prevent @click="choose(font.value)">{{ font.name }}</button><p v-if="!options.length">没有匹配的字体</p></div>
      <button class="font-refresh" type="button" :disabled="fonts.busy" @mousedown.prevent @click="fonts.load(true)"><RefreshCw :size="13" :class="{ spinning: fonts.busy }" />{{ fonts.busy ? '读取字体…' : '刷新本机字体' }}</button>
    </div>
  </div>
</template>
