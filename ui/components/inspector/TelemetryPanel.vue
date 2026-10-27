<script setup lang="ts">
import HNumberInput from "@celestia-island/hikari/components/HkNumberInput.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import ElevationPanel from "./ElevationPanel.vue";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
const { telemetry, timeline } = useEditorContext();
const { smoothingPoints, refreshSeconds, stopThresholdKmh } = toRefs(telemetry);
const { currentHeading } = toRefs(timeline);
const windows = Array.from({ length: 30 }, (_, index) => index * 2 + 3);
</script>
<template>
  <section class="panel-section">
    <div class="section-title">数据采样</div>
    <label class="setting-row"
      >速度平滑窗口（点）<HSelect panel-title="速度平滑窗口（点）" title="居中窗口：当前点及前后各半；首尾按实际可用点计算。" :model-value="String(smoothingPoints)" :options="[{ value: '0', label: '关闭' }, ...windows.map(count => ({ value: String(count), label: String(count) }))]" @update:model-value="smoothingPoints = Number($event)" /></label
    ><label class="setting-row"
      >数据刷新间隔（秒）<HNumberInput
        aria-label="数据刷新间隔（秒）"

        :min="0.01"
        :max="10"
        :step="0.01"
        :model-value="refreshSeconds" @update:model-value="refreshSeconds = Number($event)"
    /></label>
    <label class="setting-row">
      速度归零阈值（km/h）<HNumberInput
        aria-label="速度归零阈值（km/h）"

        :min="0"
        :max="2000"
        :step="0.1"
        title="低于阈值时显示 0 并保持航向；0 关闭归零。"
        :model-value="stopThresholdKmh" @update:model-value="stopThresholdKmh = Number($event)"
      />
    </label>
    <div class="setting-row">
      航向<strong
        title="正北 0°，顺时针增加；静止时保持最后有效航向。"
        data-testid="heading"
        >{{ currentHeading == null ? "—" : `${currentHeading.toFixed(1)}°` }}</strong
      >
    </div>
    <ElevationPanel />
  </section>
</template>
