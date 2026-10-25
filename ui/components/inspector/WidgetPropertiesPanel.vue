<script setup lang="ts">
import { Settings2, Check, Plus, Bold, Italic, FolderOpen } from "lucide-vue-next";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
import LocationProperties from "./LocationProperties.vue";
import MapProperties from "./MapProperties.vue";
import RouteProperties from "./RouteProperties.vue";
import FontFamilySelect from "./FontFamilySelect.vue";
const { layout, svgElements } = useEditorContext();
const { selected, maximumScale } = toRefs(layout);
const { remember, resetSelected, updatePosition, updateScale } = layout;
function typography(key: 'fontFamily' | 'fontSize' | 'bold' | 'italic', value: string | number | boolean | undefined) {
  if (!selected.value || selected.value.locked) return;
  remember();
  selected.value.typography = { ...selected.value.typography, [key]: value };
}
</script>

<template>
  <section v-if="selected" class="panel-section properties-section">
    <div class="section-title">
      <span><Settings2 :size="15" /> {{ selected.label }}设置</span
      ><div class="property-title-actions"><button v-if="selected.svg" class="icon-button" aria-label="查看元素 SVG 源文件" title="查看源文件位置" @click="svgElements.inspectSource(selected.svg.source, selected.label, selected.svg)"><FolderOpen :size="15" /></button><button class="text-button" @click="resetSelected">重置</button></div>
    </div>
    <RouteProperties />
    <MapProperties />
    <LocationProperties />
    <div class="position-fields">
      <label
        >X
        <input
          aria-label="元素 X 位置（百分比）"
          type="number"
          min="0"
          max="100"
          step="0.01"
          :disabled="selected.locked"
          :value="(selected.x * 100).toFixed(2)"
          @focus="remember"
          @change="updatePosition('x', $event)"
        /><span>%</span></label
      ><label
        >Y
        <input
          aria-label="元素 Y 位置（百分比）"
          type="number"
          min="0"
          max="100"
          step="0.01"
          :disabled="selected.locked"
          :value="(selected.y * 100).toFixed(2)"
          @focus="remember"
          @change="updatePosition('y', $event)"
        /><span>%</span></label
      >
    </div>
    <label v-if="selected.svg?.source.includes('{$SpeedRatio}') || selected.svg?.source.includes('{$SpeedPercent}') || selected.svg?.source.includes('{$SpeedAngle}')" class="setting-row">速度满刻度<input aria-label="速度满刻度 km/h" type="number" min="1" max="2000" :value="selected.speedMaxKmh ?? 60" :disabled="selected.locked" @focus="remember" @change="selected.speedMaxKmh = Math.max(1, Math.min(2000, Number(($event.target as HTMLInputElement).value) || 60))" /></label>
    <div class="typography-fields">
      <div class="font-field"><span>字体</span><FontFamilySelect :key="selected.id" :disabled="selected.locked" :model-value="selected.typography?.fontFamily" @update:model-value="typography('fontFamily', $event)" /></div>
      <div class="font-controls"><label>字号<input aria-label="元素字号" type="number" min="8" max="200" placeholder="自动" :disabled="selected.locked" :value="selected.typography?.fontSize" @change="typography('fontSize', ($event.target as HTMLInputElement).value ? Math.max(8, Math.min(200, Number(($event.target as HTMLInputElement).value))) : undefined)" /></label>
      <button :disabled="selected.locked" :aria-pressed="selected.typography?.bold === true" aria-label="加粗" @click="typography('bold', !selected.typography?.bold)"><Bold :size="16" /></button>
      <button :disabled="selected.locked" :aria-pressed="selected.typography?.italic === true" aria-label="斜体" @click="typography('italic', !selected.typography?.italic)"><Italic :size="16" /></button></div>
    </div>
    <div class="slider-label"
      >大小 <label class="scale-value"><input aria-label="元素大小百分比" type="number" min="0" :max="maximumScale * 100" step="0.01" :value="Number((selected.scale * 100).toFixed(1))" :disabled="selected.locked" @focus="remember" @change="layout.setScale(Number(($event.target as HTMLInputElement).value) / 100)" />%</label></div
    ><input
      class="property-slider"
      aria-label="元素大小"
      type="range"
      min="0"
      :max="maximumScale"
      step="0.001"
      :value="selected.scale"
      :disabled="selected.locked"
      @pointerdown="remember"
      @keydown="remember"
      @input="updateScale"
    />
    <label class="slider-label"
      >背景不透明度 <span>{{ selected.opacity }}%</span></label
    ><input
      class="property-slider"
      aria-label="背景不透明度"
      type="range"
      min="0"
      max="100"
      step="1"
      v-model.number="selected.opacity"
      @pointerdown="remember"
    />
    <div class="color-setting">
      <span>强调色</span>
      <div class="color-swatches">
        <button
          v-for="color in ['#c7f284', '#ffffff', '#8bc9f4', '#ffbc8c']"
          :key="color"
          :style="{ background: color }"
          :class="{ checked: selected.color === color }"
          :aria-label="`强调色 ${color}`"
          @click="
            remember();
            selected.color = color;
          "
        >
          <Check v-if="selected.color === color" :size="11" /></button
        ><label class="custom-color" title="自定义颜色"
          ><Plus :size="12" /><input
            aria-label="自定义强调色"
            type="color"
            v-model="selected.color"
            @focus="remember"
        /></label>
      </div>
    </div>
  </section>
</template>
