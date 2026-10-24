<script setup lang="ts">
import { computed, ref } from 'vue';
import { Upload } from 'lucide-vue-next';
import { SVG_EXAMPLES } from '../../domain/svgExamples';
import { ELEMENT_CATEGORIES, catalogItems } from '../../domain/elementCatalog';
import { useEditorContext } from '../../editor/context';
import { bindSvg } from '../../domain/svgBindings';
import { svgDataUrl } from '../../domain/widgetSvg';
const preview = (source: string) => svgDataUrl(bindSvg(source, { timestampMs: 0, latitude: 31.2304, longitude: 121.4737, elevation: 128, speedMps: 10, headingDeg: 45, distanceMeters: 6400, segment: 0 }, 1234, '#e5f0db', { progress: { distanceMeters: 6400, totalMeters: 10000, remainingMeters: 3600, remainingSeconds: 1200, totalSeconds: 3600, fraction: 0.64 } }));
const { svgElements } = useEditorContext();
const category = ref('motion');
const items = computed(() => catalogItems(category.value));
</script>
<template>
  <div class="element-catalog">
    <div class="catalog-tabs" role="tablist" aria-label="元素分类">
      <button v-for="item in ELEMENT_CATEGORIES" :key="item.key" role="tab" :aria-selected="category === item.key" @click="category = item.key">{{ item.label }}</button>
    </div>
    <details class="svg-examples"><summary>SVG 范例</summary><div class="catalog-grid"><button v-for="example in SVG_EXAMPLES" :key="example.key" @click="svgElements.addSvg(example.source, example.label, example.width)"><span class="catalog-preview"><img :src="preview(example.source)" alt="" /></span><span>{{ example.label }}</span></button></div></details>
    <div class="catalog-grid">
      <button v-for="item in items" :key="item.key" @click="svgElements.addTelemetryItem(item.key)"><span class="catalog-preview"><img :src="preview(item.source)" alt="" /></span><span>{{ item.label }}</span></button>
    </div>
    <div class="catalog-tools">
      <button class="text-button" @click="svgElements.chooseSvg"><Upload :size="14" />导入 SVG</button>
      <button class="text-button" @click="svgElements.addTelemetryStrip">添加组合</button>
    </div>
  </div>
</template>
