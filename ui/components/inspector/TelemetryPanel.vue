<script setup lang="ts">
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
const { telemetry, timeline } = useEditorContext();
const { smoothingSeconds, refreshSeconds, stopThresholdKmh } =
  toRefs(telemetry);
const { currentHeading } = toRefs(timeline);
</script>
<template>
  <section class="panel-section">
    <div class="section-title">数据采样</div>
    <label class="setting-row"
      >速度平滑窗口（秒）<input
        aria-label="速度平滑窗口（秒）"
        type="number"
        min="0"
        max="60"
        step="0.5"
        v-model.number="smoothingSeconds" /></label
    ><label class="setting-row"
      >数据刷新间隔（秒）<input
        aria-label="数据刷新间隔（秒）"
        type="number"
        min="0.01"
        max="10"
        step="0.01"
        v-model.number="refreshSeconds"
    /></label>
    <p class="field-hint">
      按时间窗口内距离计算速度，过滤孤立跳点，再插值到刷新时刻。0
      使用原始点速度。
    </p>
    <label class="setting-row">
      速度归零阈值（km/h）<input
        aria-label="速度归零阈值（km/h）"
        type="number"
        min="0"
        max="2000"
        step="0.1"
        v-model.number="stopThresholdKmh"
      />
    </label>
    <p class="field-hint">低于阈值时显示 0，并保持最后有效航向；0 关闭归零。</p>
    <div class="setting-row">
      航向<strong data-testid="heading">{{
        currentHeading == null ? "—" : `${currentHeading.toFixed(1)}°`
      }}</strong>
    </div>
    <p class="field-hint">正北 0°，顺时针增加；静止时保持最后有效航向。</p>
  </section>
</template>
