<script setup lang="ts">
import HIconButton from "@celestia-island/hikari/components/HkIconButton.tsx";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { computed, ref } from 'vue';
import HTabs from '@celestia-island/hikari/components/HkTabs.tsx';
import { Upload, FolderOpen } from 'lucide-vue-next';
import NavigationCatalog from './NavigationCatalog.vue';
import { SVG_EXAMPLES } from '../../domain/svgExamples';
import { ELEMENT_CATEGORIES, catalogItems } from '../../domain/elementCatalog';
import { useEditorContext } from '../../editor/context';
import { bindSvg } from '../../domain/svgBindings';
import { svgDataUrl } from '../../domain/widgetSvg';
const preview = (source: string) => svgDataUrl(bindSvg(source, { timestampMs: 0, latitude: 31.2304, longitude: 121.4737, elevation: 128, speedMps: 10, headingDeg: 45, distanceMeters: 6400, segment: 0 }, 1234, '#e5f0db', { address: { province: '广东省', city: '深圳市', district: '宝安区', street: '新安街道', road: '宝安大道' }, progress: { distanceMeters: 6400, totalMeters: 10000, remainingMeters: 3600, remainingSeconds: 1200, totalSeconds: 3600, fraction: 0.64 } }));
const { svgElements } = useEditorContext();
const category = ref('motion');
const categories = ELEMENT_CATEGORIES.map(item => ({ key: item.key, label: item.label }));
const examples = computed(() => SVG_EXAMPLES.filter(item => item.category === category.value));
const items = computed(() => catalogItems(category.value));
</script>
<template>
  <div class="element-catalog">
    <HTabs v-model="category" :tabs="categories" :render-panels="false" aria-label="元素分类" />
    <div class="catalog-grid">
      <div v-for="example in examples" :key="example.key" class="catalog-card"><HButton variant="outline" size="sm" class="catalog-add" @click="svgElements.addSvg(example.source, example.label, example.width, { exampleKey: example.key })"><span class="catalog-preview"><img :src="preview(example.source)" alt="" /></span><span>{{ example.label }}</span></HButton><HIconButton variant="ghost" :size="28" class="icon-button source-action" :aria-label="`查看${example.label}源文件`" title="查看源文件位置" @click="svgElements.inspectSource(example.source, example.label, { exampleKey: example.key })"><FolderOpen :size="14" /></HIconButton></div>
      <HButton variant="outline" size="sm" v-for="item in items" :key="item.key" @click="svgElements.addTelemetryItem(item.key)"><span class="catalog-preview"><img :src="preview(item.source)" alt="" /></span><span>{{ item.label }}</span></HButton>
    </div>
    <NavigationCatalog v-if="category === 'navigation'" />
    <div class="catalog-tools">
      <HButton variant="ghost" size="sm" class="text-button" @click="svgElements.addText">添加文本</HButton>
      <HButton variant="ghost" size="sm" class="text-button" @click="svgElements.chooseSvg"><Upload :size="14" />导入 SVG</HButton>
      <HButton variant="ghost" size="sm" class="text-button" @click="svgElements.addTelemetryStrip">添加组合</HButton>
    </div>
  </div>
</template>
