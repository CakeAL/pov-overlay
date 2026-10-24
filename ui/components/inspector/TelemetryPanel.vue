<script setup lang="ts">
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
      >速度平滑窗口（点）<select
        aria-label="速度平滑窗口（点）"
        title="居中窗口：当前点及前后各半；首尾按实际可用点计算。"
        v-model.number="smoothingPoints"
      >
        <option :value="0">关闭</option>
        <option v-for="count in windows" :key="count" :value="count">
          {{ count }}
        </option>
      </select></label
    ><label class="setting-row"
      >数据刷新间隔（秒）<input
        aria-label="数据刷新间隔（秒）"
        type="number"
        min="0.01"
        max="10"
        step="0.01"
        v-model.number="refreshSeconds"
    /></label>
    <label class="setting-row">
      速度归零阈值（km/h）<input
        aria-label="速度归零阈值（km/h）"
        type="number"
        min="0"
        max="2000"
        step="0.1"
        title="低于阈值时显示 0 并保持航向；0 关闭归零。"
        v-model.number="stopThresholdKmh"
      />
    </label>
    <div class="setting-row">
      航向<strong
        title="正北 0°，顺时针增加；静止时保持最后有效航向。"
        data-testid="heading"
        >{{ currentHeading == null ? "—" : `${currentHeading.toFixed(1)}°` }}</strong
      >
    </div>
  </section>
</template>
