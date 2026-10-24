<script setup lang="ts">
import {
  GripVertical,
  Gauge,
  MapPin,
  Eye,
  EyeOff,
  LockKeyhole,
  UnlockKeyhole,
  MousePointer2,
} from "lucide-vue-next";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
const { layout, svgElements } = useEditorContext();
const { widgets, selectedId } = toRefs(layout);
const { svgInput } = toRefs(svgElements);
const { toggleVisible, toggleLock } = layout;
</script>

<template>
  <section class="panel-section layers-section">
    <div class="section-title">
      <span><span class="section-index">03</span> 画布元素</span
      ><span class="muted"
        >{{ widgets.filter((widget) => widget.visible).length }} 个可见</span
      >
    </div>
    <div class="element-actions">
      <button class="text-button" @click="svgElements.chooseSvg">
        导入 SVG</button
      ><button class="text-button" @click="svgElements.addTelemetryStrip">
        添加数据条</button
      ><button
        class="text-button"
        :disabled="!selectedId"
        @click="svgElements.removeSelected"
      >
        删除元素
      </button>
    </div>
    <input
      ref="svgInput"
      class="file-input"
      data-testid="svg-file"
      type="file"
      accept=".svg,image/svg+xml"
      @change="svgElements.selectedSvg"
    />
    <div
      v-for="widget in widgets"
      :key="widget.id"
      class="layer-row"
      :class="{
        active: selectedId === widget.id,
        hidden: !widget.visible,
      }"
    >
      <button class="layer-select" @click="selectedId = widget.id">
        <GripVertical :size="13" class="layer-grip" /><span class="layer-icon"
          ><Gauge v-if="widget.kind === 'speed'" :size="18" /><MapPin
            v-else
            :size="18" /></span
        ><span
          ><strong>{{ widget.label }}</strong
          ><small>{{
            widget.kind === "svg"
              ? "SVG"
              : widget.kind === "speed"
                ? "速度"
                : "经纬度"
          }}</small></span
        >
      </button>
      <button
        class="icon-button"
        :aria-label="`${widget.visible ? '隐藏' : '显示'}${widget.label}`"
        :title="widget.visible ? '隐藏' : '显示'"
        @click="toggleVisible(widget)"
      >
        <Eye v-if="widget.visible" :size="15" /><EyeOff v-else :size="15" />
      </button>
      <button
        class="icon-button"
        :aria-label="`${widget.locked ? '解锁' : '锁定'}${widget.label}`"
        :title="widget.locked ? '解锁位置' : '锁定位置'"
        @click="toggleLock(widget)"
      >
        <LockKeyhole v-if="widget.locked" :size="14" /><UnlockKeyhole
          v-else
          :size="14"
        />
      </button>
    </div>
    <p class="field-hint">
      SVG
      字段：{$Speed}、{$Latitude}、{$Longitude}、{$Elevation}、{$Heading}、{$Distance}、{$Elapsed}、{$Color}
    </p>
    <p class="section-hint">
      <MousePointer2 :size="12" /> 在右侧画布拖动元素，自由排布。
    </p>
  </section>
</template>
