<script setup lang="ts">
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import HIconButton from "@celestia-island/hikari/components/HkIconButton.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import HTabs from "@celestia-island/hikari/components/HkTabs.tsx";
import SignCategoryTag from "./SignCategoryTag.vue";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import { useEditorContext } from "../../editor/context";
import {
  SIGN_CATEGORIES,
  SIGN_TEMPLATES,
  signLabel,
  isRouteNumber,
  signCode,
} from "../../domain/signs/model";
import SignPreview from "./SignPreview.vue";
import SignTextControls from "./SignTextControls.vue";
import SignContentFields from "./SignContentFields.vue";
const { signMaker: maker } = useEditorContext();
const editing = ref(true);
const choices = computed(() =>
  SIGN_TEMPLATES.filter((t) => t.category === maker.category).map((t) => ({
    value: t.value,
    label: t.label,
  })),
);
const disabled = computed(
  () =>
    maker.busy ||
    maker.loading ||
    !!maker.error ||
    !!maker.validation ||
    !maker.source,
);
</script>
<template>
  <main class="sign-maker-page" aria-label="道路交通牌制作">
    <header class="sign-maker-header">
      <HButton
        variant="ghost"
        size="sm"
        :disabled="maker.busy"
        @click="maker.pageOpen = false"
        >← 返回编辑器</HButton
      >
      <h1>道路交通牌</h1>
      <HButton
        class="sign-export-action"
        :disabled="disabled"
        :loading="maker.busy"
        @click="maker.download"
        >导出 SVG</HButton
      >
    </header>
    <div class="sign-maker-categories">
      <HTabs
        v-model="maker.category"
        :tabs="[...SIGN_CATEGORIES]"
        :render-panels="false"
        aria-label="标牌分类"
      />
    </div>
    <div class="sign-maker-body">
      <aside class="sign-maker-library" aria-label="标牌列表">
        <h2>
          {{ SIGN_CATEGORIES.find((c) => c.key === maker.category)?.label }}
        </h2>
        <HSelect
          panel-title="添加标牌"
          model-value=""
          placeholder="＋ 添加标牌"
          :options="choices"
          @update:model-value="maker.add"
        />
        <div
          v-for="item in maker.visibleItems"
          :key="item.id"
          class="sign-library-item"
        >
          <HButton
            :variant="maker.selectedId === item.id ? 'secondary' : 'ghost'"
            class="sign-library-select"
            @click="maker.selectedId = item.id"
            ><SignCategoryTag :design="item.design" />
            <strong>{{
              isRouteNumber(item.design.template)
                ? `${signCode(item.design)} ${item.design.roadName}`.trim()
                : signLabel(item.design)
            }}</strong></HButton
          >
          <div class="sign-library-tools">
            <HIconButton
              variant="ghost"
              :size="24"
              aria-label="上移标牌"
              @click="maker.move(item.id, -1)"
              ><ArrowUp :size="14" /></HIconButton
            ><HIconButton
              variant="ghost"
              :size="24"
              aria-label="下移标牌"
              @click="maker.move(item.id, 1)"
              ><ArrowDown :size="14" /></HIconButton
            ><HIconButton
              variant="ghost"
              :size="24"
              aria-label="删除标牌"
              @click="maker.remove(item.id)"
              ><Trash2 :size="14"
            /></HIconButton>
          </div>
        </div>
        <p v-if="!maker.visibleItems.length" class="sign-maker-note">
          添加一个标牌开始制作。
        </p>
      </aside>
      <section class="sign-maker-center" aria-label="标牌预览">
        <div class="sign-preview-toolbar">
          <HIconButton
            variant="ghost"
            :size="28"
            aria-label="缩小预览"
            @click="maker.zoom = Math.max(25, maker.zoom - 25)"
            ><Minus :size="16" /></HIconButton
          ><span>{{ maker.zoom }}%</span
          ><HIconButton
            variant="ghost"
            :size="28"
            aria-label="放大预览"
            @click="maker.zoom = Math.min(400, maker.zoom + 25)"
            ><Plus :size="16" /></HIconButton
          ><HIconButton
            variant="ghost"
            :size="28"
            aria-label="重置预览缩放"
            @click="maker.zoom = 100"
            ><RotateCcw :size="16"
          /></HIconButton>
          <HButton
            :variant="editing ? 'secondary' : 'ghost'"
            size="sm"
            :aria-pressed="editing"
            @click="editing = !editing"
            >编辑文字</HButton
          >
        </div>
        <SignPreview :editing="editing" />
        <p v-if="maker.preview" class="sign-maker-note">
          {{ maker.preview.width }} × {{ maker.preview.height }} · SVG
        </p>
        <p class="sign-maker-note">
          版式依据 GB 5768.2—2022 · 字形来自内置交通标志字体
        </p>
      </section>
      <aside class="sign-maker-controls" aria-label="标牌设置">
        <template v-if="maker.design"
          ><SignTextControls />
          <SignContentFields :design="maker.design" />
          <p class="sign-maker-note">
            字体按用途自动选择：一般文字 A 型，道路及出口编号 B
            型；箭杆内道路编号使用 C 型。
          </p>
          <p v-if="maker.validation" role="status" class="sign-maker-note">
            {{ maker.validation }}
          </p></template
        >
        <p v-else class="sign-maker-note">选择或添加标牌。</p>
      </aside>
    </div>
  </main>
</template>
