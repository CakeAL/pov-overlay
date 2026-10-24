<script setup lang="ts">
import {
  Gauge,
  CodeXml,
  MapPin,
  Eye,
  EyeOff,
  LockKeyhole,
  UnlockKeyhole,
} from "lucide-vue-next";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
import { TELEMETRY_ITEMS } from "../../domain/telemetryItems";
const { layout, svgElements } = useEditorContext();
const { widgets, selectedId } = toRefs(layout);
const { svgInput } = toRefs(svgElements);
const { toggleVisible, toggleLock } = layout;
function addItem(event: Event) {
  const input = event.target as HTMLSelectElement;
  svgElements.addTelemetryItem(input.value);
  input.value = "";
}
</script>

<template>
  <section class="panel-section layers-section">
    <div class="section-title">画布元素</div>
    <div class="element-actions">
      <button
        class="text-button"
        title="支持 {$Speed}、{$Latitude}、{$Longitude}、{$Elevation}、{$Heading}、{$Distance}、{$Elapsed}、{$Color} 等字段。"
        @click="svgElements.chooseSvg"
      >
        导入 SVG</button
      ><button class="text-button" @click="svgElements.addTelemetryStrip">
        添加数据条
      </button>
      <select
        class="data-item-select"
        aria-label="添加数据项"
        value=""
        @change="addItem"
      >
        <option value="" disabled>添加数据项</option>
        <option
          v-for="item in TELEMETRY_ITEMS"
          :key="item.key"
          :value="item.key"
        >
          {{ item.label }}
        </option>
      </select>
      <button
        v-if="svgElements.canSplitTelemetryStrip"
        class="text-button"
        @click="svgElements.splitTelemetryStrip"
      >
        拆分数据条
      </button>
      <button
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
        <span class="layer-icon"
          ><Gauge v-if="widget.kind === 'speed'" :size="18" /><MapPin
            v-else-if="widget.kind === 'coordinates'"
            :size="18" /><CodeXml v-else :size="18" /></span
        ><strong>{{ widget.label }}</strong>
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
  </section>
</template>
