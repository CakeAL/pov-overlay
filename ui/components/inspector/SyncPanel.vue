<script setup lang="ts">
import HNumberInput from "@celestia-island/hikari/components/HkNumberInput.tsx";
import HInput from "@celestia-island/hikari/components/HkInput.tsx";
import { Settings2, ChevronRight } from "lucide-vue-next";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
import { dateText, timeZone } from "../../lib/format";
const { media, alignment } = useEditorContext();
const { track, activeVideo: asset } = toRefs(media);
const { offset, alignmentKnown, syncMode, showTiming, manualStart } =
  toRefs(alignment);
const { autoAlign, setManualOffset, applyManualTime } = alignment;
</script>

<template>
  <section v-if="asset" class="panel-section sync-section">
    <div class="section-title">
      <span>时间同步</span
      ><span
        v-if="syncMode !== 'none'"
        class="status-pill"
        :class="{ manual: syncMode === 'manual' }"
        ><span></span>{{ syncMode === "auto" ? "自动对齐" : "手动对齐" }}</span
      >
    </div>
    <p v-if="!track || !alignmentKnown" class="field-hint" role="status">
      {{ !track ? "请导入 GPX" : "缺少拍摄时间，请设置视频起始时间或偏移。" }}
    </p>
    <div class="offset-control">
      <span>视频起点在 GPX 的位置</span
      ><label
        ><HNumberInput
          aria-label="时间偏移（秒）"
          data-testid="time-offset"

          :step="0.1"
          :disabled="!track"
          :model-value="offset"
          @update:model-value="setManualOffset"
        /><span>s</span></label
      >
    </div>
    <HButton variant="ghost" size="sm" class="text-button timing-toggle" @click="showTiming = !showTiming">
      <Settings2 :size="13" />
      {{ showTiming ? "收起时间设置" : "调整起始时间"
      }}<ChevronRight :size="13" :class="{ rotated: showTiming }" />
    </HButton>
    <div v-if="showTiming" class="timing-details">
      <label class="field-label" for="video-start"
        >视频起始时间 <span>{{ timeZone }}</span></label
      >
      <HInput
        id="video-start"
        data-testid="video-start"
        class="text-input"
        type="datetime-local"
        step="0.001"
        v-model="manualStart"
        :disabled="!track"
      />
      <div class="timing-actions">
        <HButton
          size="xs"
          variant="secondary"
          :disabled="!track || !manualStart"
          @click="applyManualTime"
          >应用时间</HButton
        ><HButton variant="ghost" size="sm"
          class="text-button"
          :disabled="!track || asset?.capturedAtMs == null"
          @click="autoAlign"
        >
          恢复自动对齐
        </HButton>
      </div>
      <p class="field-hint" :title="asset.timeSource ?? undefined">
        {{
          asset.capturedAtMs == null
            ? "未检测到拍摄时间"
            : `元数据：${dateText(asset.capturedAtMs)}`
        }}
      </p>
    </div>
  </section>
</template>
