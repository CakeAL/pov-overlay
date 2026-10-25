<script setup lang="ts">
import {
  Gauge,
  CodeXml,
  MapPin,
  Trash2,
  Eye,
  EyeOff,
  LockKeyhole,
  UnlockKeyhole,
} from "lucide-vue-next";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
import ElementCatalog from "./ElementCatalog.vue";
const { layout, svgElements } = useEditorContext();
const { widgets, selectedId } = toRefs(layout);
const { svgInput } = toRefs(svgElements);
const { toggleVisible, toggleLock } = layout;
</script>

<template>
  <section class="panel-section layers-section">
    <div class="section-title">画布元素</div>
    <ElementCatalog />
    <div class="element-actions">
      <button
        v-if="svgElements.canSplitTelemetryStrip"
        class="text-button"
        @click="svgElements.splitTelemetryStrip"
      >
        拆分数据条
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
      <button class="icon-button layer-delete" :aria-label="`删除${widget.label}`" title="删除元素" @click="layout.removeWidget(widget.id)"><Trash2 :size="15" /></button>
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
