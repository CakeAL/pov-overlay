<script setup lang="ts">
import HIconButton from "@celestia-island/hikari/components/HkIconButton.tsx";
import HNumberInput from "@celestia-island/hikari/components/HkNumberInput.tsx";
import HSlider from '@celestia-island/hikari/components/HkSlider.tsx';
import HColorPicker from '@celestia-island/hikari/components/HkColorPicker.tsx';
import HInput from "@celestia-island/hikari/components/HkInput.tsx";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { Settings2, Bold, Italic, FolderOpen } from "lucide-vue-next";
import { computed, toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
import LocationProperties from "./LocationProperties.vue";
import TextProperties from "./TextProperties.vue";
import MapProperties from "./MapProperties.vue";
import RouteProperties from "./RouteProperties.vue";
import FontFamilySelect from "./FontFamilySelect.vue";
const { layout, svgElements } = useEditorContext();
const { selected, maximumScale } = toRefs(layout);
const { remember, resetSelected, updatePosition } = layout;
const rgb = computed(() => {
  const color = selected.value?.color ?? '#ffffff';
  return { r: parseInt(color.slice(1, 3), 16), g: parseInt(color.slice(3, 5), 16), b: parseInt(color.slice(5, 7), 16) };
});
function changeColor(value: { r: number; g: number; b: number }) {
  if (!selected.value || selected.value.locked) return;
  selected.value.color = '#' + [value.r, value.g, value.b].map(n => n.toString(16).padStart(2, '0')).join('');
}
function typography(key: 'fontFamily' | 'fontSize' | 'bold' | 'italic', value: string | number | boolean | undefined) {
  if (!selected.value || selected.value.locked) return;
  remember();
  selected.value.typography = { ...selected.value.typography, [key]: value };
  if (selected.value.svg?.textTemplate != null) layout.clampWidget(selected.value);
}
</script>

<template>
  <section v-if="selected" class="panel-section properties-section">
    <div class="section-title">
      <span><Settings2 :size="15" /> {{ selected.label }}设置</span
      ><div class="property-title-actions"><HIconButton variant="ghost" :size="28" v-if="selected.svg" class="icon-button" aria-label="查看元素 SVG 源文件" title="查看源文件位置" @click="svgElements.inspectSource(selected.svg.source, selected.label, selected.svg)"><FolderOpen :size="15" /></HIconButton><HButton variant="ghost" size="sm" class="text-button" @click="resetSelected">重置</HButton></div>
    </div>
    <RouteProperties />
    <MapProperties />
    <LocationProperties />
    <TextProperties />
    <div class="position-fields">
      <label
        >X
        <HNumberInput @pointerdown.capture="remember"
          aria-label="元素 X 位置（百分比）"

          :min="0"
          :max="100"
          :step="0.01"
          :disabled="selected.locked"
          :model-value="Number((selected.x * 100).toFixed(2))"
          @focus.capture="remember"
          @update:model-value="updatePosition('x', $event)"
        /><span>%</span></label
      ><label
        >Y
        <HNumberInput @pointerdown.capture="remember"
          aria-label="元素 Y 位置（百分比）"

          :min="0"
          :max="100"
          :step="0.01"
          :disabled="selected.locked"
          :model-value="Number((selected.y * 100).toFixed(2))"
          @focus.capture="remember"
          @update:model-value="updatePosition('y', $event)"
        /><span>%</span></label
      >
    </div>
    <label v-if="selected.svg?.source.includes('{$SpeedRatio}') || selected.svg?.source.includes('{$SpeedPercent}') || selected.svg?.source.includes('{$SpeedAngle}')" class="setting-row">速度满刻度<HNumberInput @pointerdown.capture="remember" aria-label="速度满刻度 km/h" :min="1" :max="2000" :model-value="selected.speedMaxKmh ?? 60" :disabled="selected.locked" @focus.capture="remember" @update:model-value="selected.speedMaxKmh = Math.max(1, Math.min(2000, Number($event) || 60))" /></label>
    <div class="typography-fields">
      <div class="font-field"><span>字体</span><FontFamilySelect :key="selected.id" :disabled="selected.locked" :model-value="selected.typography?.fontFamily" @update:model-value="typography('fontFamily', $event)" /></div>
      <div class="font-controls"><label>字号<HInput aria-label="元素字号" type="number" min="8" max="200" placeholder="自动" :disabled="selected.locked" :model-value="String((selected.typography?.fontSize) ?? '')" @change="typography('fontSize', ($event.target as HTMLInputElement).value ? Math.max(8, Math.min(200, Number(($event.target as HTMLInputElement).value))) : undefined)" /></label>
      <HIconButton :variant="selected.typography?.bold ? 'secondary' : 'ghost'" :size="28" :disabled="selected.locked" :aria-pressed="selected.typography?.bold === true" aria-label="加粗" @click="typography('bold', !selected.typography?.bold)"><Bold :size="16" /></HIconButton>
      <HIconButton :variant="selected.typography?.italic ? 'secondary' : 'ghost'" :size="28" :disabled="selected.locked" :aria-pressed="selected.typography?.italic === true" aria-label="斜体" @click="typography('italic', !selected.typography?.italic)"><Italic :size="16" /></HIconButton></div>
    </div>
    <div class="slider-label"
      >大小 <label class="scale-value"><HNumberInput @pointerdown.capture="remember" aria-label="元素大小百分比" :min="0" :max="maximumScale * 100" :step="0.01" :model-value="Number((selected.scale * 100).toFixed(1))" :disabled="selected.locked" @focus.capture="remember" @update:model-value="layout.setScale(Number($event) / 100)" />%</label></div
    ><HSlider @pointerdown.capture="remember" class="property-slider" aria-label="元素大小" :min="0" :max="maximumScale" :step="0.001" :model-value="selected.scale" :disabled="selected.locked" @keydown.capture="remember" @update:model-value="layout.setScale" />
    <label class="slider-label"
      >背景不透明度 <span>{{ selected.opacity }}%</span></label
    ><HSlider @pointerdown.capture="remember" class="property-slider" aria-label="背景不透明度" :min="0" :max="100" :step="1" v-model="selected.opacity" :disabled="selected.locked" @keydown.capture="remember" />
    <div class="color-setting"><span>强调色</span><HColorPicker @pointerdown.capture="remember" @keydown.capture="remember" v-bind="rgb" layout="row" label="自定义颜色" :inert="selected.locked || undefined" @change="changeColor" /></div>
  </section>
</template>
