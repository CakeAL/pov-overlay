<script setup lang="ts">
import {toRefs} from 'vue';
import {useEditorContext} from '../../editor/context';
const {telemetry,timeline}=useEditorContext();
const {smoothingSeconds,refreshSeconds}=toRefs(telemetry);
const {currentHeading}=toRefs(timeline);
</script>
<template><section class="panel-section"><div class="section-title">数据采样</div><label class="setting-row">速度平滑窗口（秒）<input aria-label="速度平滑窗口（秒）" type="number" min="0" max="60" step="0.5" v-model.number="smoothingSeconds"/></label><label class="setting-row">数据刷新间隔（秒）<input aria-label="数据刷新间隔（秒）" type="number" min="0.01" max="10" step="0.01" v-model.number="refreshSeconds"/></label><p class="field-hint">0 关闭平滑。局部拟合后使用单调三次曲线补足采样间隔。</p><div class="setting-row">航向<strong data-testid="heading">{{currentHeading==null?'—':`${currentHeading.toFixed(1)}°`}}</strong></div><p class="field-hint">正北 0°，顺时针增加；静止时保持最后有效航向。</p></section></template>
