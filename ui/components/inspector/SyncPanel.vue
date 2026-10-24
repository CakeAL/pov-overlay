<script setup lang="ts">
import { Link2, Settings2, ChevronRight } from "lucide-vue-next";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { toRefs } from "vue";
import { useEditorContext } from "../../editor/context";
import { dateText, timeZone } from "../../lib/format";
const { media, alignment } = useEditorContext();
const { track, asset } = toRefs(media);
const { offset, alignmentKnown, syncMode, showTiming, manualStart } =
  toRefs(alignment);
const { autoAlign, setManualOffset, applyManualTime } = alignment;
</script>

<template>
  <section class="panel-section sync-section">
    <div class="section-title">
      <span><span class="section-index">02</span> 时间同步</span
      ><span
        v-if="syncMode !== 'none'"
        class="status-pill"
        :class="{ manual: syncMode === 'manual' }"
        ><span></span>{{ syncMode === "auto" ? "自动对齐" : "手动对齐" }}</span
      >
    </div>
    <div class="sync-description">
      <Link2 :size="17" />
      <p>
        {{
          syncMode === "auto"
            ? "已根据视频时间元数据对齐 GPX。"
            : !track || !asset
              ? "导入轨迹与视频后，自动匹配起始时间。"
              : alignmentKnown
                ? "已应用自定义时间偏移。"
                : "视频没有可用的拍摄时间，请手动设置。"
        }}
      </p>
    </div>
    <div class="offset-control">
      <span>视频起点在 GPX 的位置</span
      ><label
        ><input
          aria-label="时间偏移（秒）"
          data-testid="time-offset"
          type="number"
          step="0.1"
          :disabled="!track"
          :value="offset"
          @change="setManualOffset"
        /><span>s</span></label
      >
    </div>
    <button class="text-button timing-toggle" @click="showTiming = !showTiming">
      <Settings2 :size="13" />
      {{ showTiming ? "收起时间设置" : "调整起始时间"
      }}<ChevronRight :size="13" :class="{ rotated: showTiming }" />
    </button>
    <div v-if="showTiming" class="timing-details">
      <label class="field-label" for="video-start"
        >视频起始时间 <span>{{ timeZone }}</span></label
      >
      <input
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
        ><button
          class="text-button"
          :disabled="!track || asset?.capturedAtMs == null"
          @click="autoAlign"
        >
          恢复自动对齐
        </button>
      </div>
      <p class="field-hint">
        {{ asset?.timeSource || "未检测到拍摄时间；不会使用文件修改时间。" }}
      </p>
      <p v-if="asset?.capturedAtMs != null" class="field-hint">
        元数据：{{
          dateText(asset.capturedAtMs)
        }}。若视频经过剪辑或设备时钟不准，可在此校正。
      </p>
    </div>
  </section>
</template>
