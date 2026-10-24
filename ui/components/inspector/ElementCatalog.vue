<script setup lang="ts">
import { computed, ref } from 'vue';
import { Plus, Upload } from 'lucide-vue-next';
import { ELEMENT_CATEGORIES, catalogItems } from '../../domain/elementCatalog';
import { useEditorContext } from '../../editor/context';
const { svgElements } = useEditorContext();
const category = ref('motion');
const items = computed(() => catalogItems(category.value));
</script>
<template>
  <div class="element-catalog">
    <div class="catalog-tabs" role="tablist" aria-label="元素分类">
      <button v-for="item in ELEMENT_CATEGORIES" :key="item.key" role="tab" :aria-selected="category === item.key" @click="category = item.key">{{ item.label }}</button>
    </div>
    <div class="catalog-grid">
      <button v-for="item in items" :key="item.key" @click="svgElements.addTelemetryItem(item.key)"><Plus :size="15" />{{ item.label }}</button>
    </div>
    <div class="catalog-tools">
      <button class="text-button" @click="svgElements.chooseSvg"><Upload :size="14" />导入 SVG</button>
      <button class="text-button" @click="svgElements.addTelemetryStrip">添加组合</button>
    </div>
  </div>
</template>
