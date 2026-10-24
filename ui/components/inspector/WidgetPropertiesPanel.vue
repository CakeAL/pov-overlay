<script setup lang="ts">
import { Settings2, Check, Plus } from "lucide-vue-next";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
const { layout } = useEditorContext();
const { selected } = toRefs(layout);
const { remember, resetSelected, updatePosition, updateScale } = layout;
</script>

<template>
  <section v-if="selected" class="panel-section properties-section">
    <div class="section-title">
      <span><Settings2 :size="15" /> {{ selected.label }}设置</span
      ><button class="text-button" @click="resetSelected">重置</button>
    </div>
    <div class="position-fields">
      <label
        >X
        <input
          aria-label="元素 X 位置（百分比）"
          type="number"
          min="0"
          max="100"
          step="0.1"
          :disabled="selected.locked"
          :value="(selected.x * 100).toFixed(1)"
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
          step="0.1"
          :disabled="selected.locked"
          :value="(selected.y * 100).toFixed(1)"
          @focus="remember"
          @change="updatePosition('y', $event)"
        /><span>%</span></label
      >
    </div>
    <label class="slider-label"
      >大小 <span>{{ Math.round(selected.scale * 100) }}%</span></label
    ><input
      class="property-slider"
      aria-label="元素大小"
      type="range"
      min="0.65"
      max="1.65"
      step="0.01"
      :value="selected.scale"
      :disabled="selected.locked"
      @pointerdown="remember"
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
