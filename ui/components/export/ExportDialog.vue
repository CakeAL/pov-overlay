<script setup lang="ts">
import { computed, toRefs } from 'vue';
import HModal from '@celestia-island/hikari/components/HkModal.tsx';
import HSelect from '@celestia-island/hikari/components/HkSelect.tsx';
import HNumberInput from '@celestia-island/hikari/components/HkNumberInput.tsx';
import HCheckbox from '@celestia-island/hikari/components/HkCheckbox.tsx';
import HProgressBar from '@celestia-island/hikari/components/HkProgressBar.tsx';
import HButton from '@celestia-island/hikari/components/HkButton.tsx';
import { useEditorContext } from '../../editor/context';
const { videoExport, playback, telemetry } = useEditorContext();
const { open, checking, busy, info, error, width, height, fps, format, background, preferHardware, encoderLabel, start, end, progress, phase, mismatch, recommendedFps, hardwareEligible } = toRefs(videoExport);
const disabled = computed(() => busy.value || checking.value);
const formats = computed(() => [
  ...(background.value === 'green' ? [{ value: 'h264Mp4', label: 'MP4 / H.264（体积较小）', disabled: !!info.value && !info.value.h264Mp4 }] : []),
  { value: 'webmVp9', label: 'WebM / VP9（透明，体积较小）', disabled: !!info.value && !info.value.webmVp9 },
  { value: 'prores4444', label: 'MOV / ProRes 4444', disabled: !!info.value && !info.value.prores4444 },
  { value: 'pngMov', label: 'MOV / PNG 无损', disabled: !!info.value && !info.value.pngMov },
]);
const resolutions = computed(() => {
  const values = ['1280x720', '1920x1080', '2560x1440', '3840x2160', '1080x1920'];
  const current = `${width.value}x${height.value}`;
  return [...values.map(value => ({ value, label: value.replace('x', ' × ') })), ...(!values.includes(current) ? [{ value: current, label: '自定义' }] : [])];
});
</script>
<template>
  <HModal v-model="open" title="导出叠加层" width="md" :closable="!busy" content-class="overlay-export-modal">
    <form id="overlay-export-form" @submit.prevent="videoExport.run" @drop.prevent.stop @dragover.prevent.stop>
      <div class="export-row"><span>背景</span><HSelect panel-title="导出背景" v-model="background" :disabled="disabled" :options="[{ value: 'transparent', label: '透明（Alpha）' }, { value: 'green', label: '绿幕' }]" /></div>
      <div class="export-row"><span>格式</span><HSelect panel-title="导出格式" v-model="format" :disabled="disabled" :options="formats" /></div>
      <HCheckbox label="优先硬件编码" :model-value="hardwareEligible && preferHardware" :disabled="disabled || !hardwareEligible" @update:model-value="preferHardware = $event" />
      <p v-if="!hardwareEligible" class="export-hint">{{ format === 'pngMov' ? 'PNG 没有可用的硬件编码器。' : '当前 VP9 硬件编码器不保留 Alpha，透明输出使用软件编码。' }}</p>
      <div class="export-row"><span>分辨率</span><HSelect panel-title="分辨率预设" :model-value="`${width}x${height}`" :disabled="disabled" :options="resolutions" @update:model-value="videoExport.resolution" /></div>
      <div class="export-dimensions">
        <HNumberInput label="宽度" v-model="width" :min="64" :max="7680" :step="2" :disabled="disabled" /><span>×</span>
        <HNumberInput label="高度" v-model="height" :min="64" :max="7680" :step="2" :disabled="disabled" />
      </div>
      <p v-if="mismatch" class="export-hint">画布将等比居中，空白区域{{ background === 'green' ? '为绿色' : '透明' }}。</p>
      <div class="export-row"><span>帧率</span><HNumberInput v-model="fps" :min="0.1" :max="120" :step="0.001" :disabled="disabled" suffix="fps" /></div>
      <p class="export-hint">推荐 {{ recommendedFps }} fps（1 / {{ telemetry.refreshSeconds }} 秒），减少重复帧可加快导出。<HButton v-if="fps !== recommendedFps" variant="ghost" size="xs" :disabled="disabled" @click="fps = recommendedFps">使用推荐</HButton></p>
      <div class="export-dimensions">
        <HNumberInput label="起始秒" v-model="start" :min="0" :max="playback.duration" :step="0.01" :disabled="disabled" /><span>—</span>
        <HNumberInput label="结束秒" v-model="end" :min="0" :max="playback.duration" :step="0.01" :disabled="disabled" />
      </div>
      <p class="export-hint">仅导出画布元素，背景素材不进入成片。</p>
      <p v-if="background === 'green'" class="export-hint">绿幕需在剪辑软件中抠像，半透明边缘可能损失。</p>
      <p v-if="checking" role="status">正在检查 FFmpeg…</p>
      <p v-if="error" class="export-error" role="alert">{{ error }}</p>
      <div v-if="busy || phase" class="export-progress" role="status"><span>{{ phase }}<span v-if="encoderLabel"> · {{ encoderLabel }}</span><span v-if="busy"> · {{ Math.round(progress * 100) }}%</span></span><HProgressBar v-if="busy" :value="progress" :max="1" aria-label="导出进度" /></div>
    </form>
    <template #footer>
      <HButton v-if="error && !busy" variant="ghost" @click="videoExport.checkEncoder">重新检查</HButton>
      <HButton v-if="busy" variant="outline" @click="videoExport.cancel">取消导出</HButton>
      <HButton v-else type="submit" form="overlay-export-form" :disabled="checking || !info || !videoExport.ready">导出</HButton>
    </template>
  </HModal>
</template>
