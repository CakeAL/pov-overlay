<script setup lang="ts">
import { ref, toRefs, watch } from "vue";
import { X } from "lucide-vue-next";
import { useEditorContext } from "../../editor/context";
const { videoExport, playback } = useEditorContext();
const { open, checking, busy, info, error, width, height, fps, format, background, preferHardware, encoderLabel, start, end, progress, phase, mismatch } = toRefs(videoExport);
const dialog = ref<HTMLDialogElement>();
watch(open, (value) => {
  if (value) dialog.value?.showModal();
  else dialog.value?.close();
}, { flush: "post" });
function close() { if (!busy.value) open.value = false; }
</script>
<template>
  <dialog ref="dialog" class="export-dialog" aria-labelledby="export-title" @cancel.prevent="close" @close="open = false" @keydown.stop @drop.prevent.stop @dragover.prevent.stop>
    <form @submit.prevent="videoExport.run">
      <header class="export-header">
        <h2 id="export-title">导出叠加层</h2>
        <button type="button" class="icon-button" aria-label="关闭导出" :disabled="busy" @click="close"><X :size="18" /></button>
      </header>
      <fieldset :disabled="busy || checking">
        <label class="export-row">背景<select v-model="background" aria-label="导出背景">
          <option value="transparent">透明（Alpha）</option><option value="green">绿幕</option>
        </select></label>
        <label class="export-row">格式<select v-model="format" aria-label="导出格式">
          <option v-if="background === 'green'" value="h264Mp4" :disabled="!!info && !info.h264Mp4">MP4 / H.264（体积较小）</option>
          <option value="webmVp9" :disabled="!!info && !info.webmVp9">WebM / VP9（透明，体积较小）</option>
          <option value="prores4444" :disabled="!!info && !info.prores4444">MOV / ProRes 4444</option>
          <option value="pngMov" :disabled="!!info && !info.pngMov">MOV / PNG 无损</option>
        </select></label>
        <label class="export-hardware" v-if="format === 'prores4444' || format === 'h264Mp4'">
          <input type="checkbox" v-model="preferHardware" aria-label="优先硬件编码" />优先硬件编码
        </label>
        <label class="export-row">分辨率<select aria-label="分辨率预设" :value="`${width}x${height}`" @change="videoExport.resolution">
          <option value="1280x720">1280 × 720</option><option value="1920x1080">1920 × 1080</option>
          <option value="2560x1440">2560 × 1440</option><option value="3840x2160">3840 × 2160</option>
          <option value="1080x1920">1080 × 1920</option><option :value="`${width}x${height}`" v-if="!['1280x720','1920x1080','2560x1440','3840x2160','1080x1920'].includes(`${width}x${height}`)">自定义</option>
        </select></label>
        <div class="export-dimensions">
          <label>宽度<input type="number" aria-label="导出宽度" v-model.number="width" min="64" max="7680" step="2" required /></label>
          <span>×</span><label>高度<input type="number" aria-label="导出高度" v-model.number="height" min="64" max="7680" step="2" required /></label>
        </div>
        <p v-if="mismatch" class="export-hint">画布将等比居中，空白区域{{ background === 'green' ? '为绿色' : '透明' }}。</p>
        <label class="export-row">帧率<input type="number" aria-label="导出帧率" v-model.number="fps" min="1" max="120" step="0.001" list="export-fps" required /></label>
        <datalist id="export-fps"><option v-for="value in [24,25,30,50,60]" :key="value" :value="value" /></datalist>
        <div class="export-dimensions">
          <label>起始秒<input type="number" aria-label="导出起始秒" v-model.number="start" min="0" :max="playback.duration" step="0.01" required /></label>
          <span>—</span><label>结束秒<input type="number" aria-label="导出结束秒" v-model.number="end" min="0" :max="playback.duration" step="0.01" required /></label>
        </div>
      </fieldset>
      <p class="export-hint">仅导出画布元素，背景素材不进入成片。</p>
      <p v-if="background === 'green'" class="export-hint">绿幕需在剪辑软件中抠像，半透明边缘可能损失。</p>
      <p v-if="checking" role="status">正在检查 FFmpeg…</p>
      <p v-if="error" class="export-error" role="alert">{{ error }}</p>
      <div v-if="busy || phase" class="export-progress" role="status">
        <span>{{ phase }}<span v-if="encoderLabel"> · {{ encoderLabel }}</span><span v-if="busy"> · {{ Math.round(progress * 100) }}%</span></span>
        <progress v-if="busy" :value="progress" max="1" aria-label="导出进度" />
      </div>
      <footer class="export-actions">
        <button v-if="error && !busy" type="button" class="text-button" @click="videoExport.checkEncoder">重新检查</button>
        <button v-if="busy" type="button" @click="videoExport.cancel">取消导出</button>
        <button v-else type="submit" :disabled="checking || !info || !videoExport.ready">导出</button>
      </footer>
    </form>
  </dialog>
</template>
