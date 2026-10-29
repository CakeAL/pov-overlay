<script setup lang="ts">
import { computed, toRefs } from "vue";
import HModal from "@celestia-island/hikari/components/HkModal.tsx";
import HTable from "@celestia-island/hikari/components/HkTable.tsx";
import HInput from "@celestia-island/hikari/components/HkInput.tsx";
import HSelect from "@celestia-island/hikari/components/HkSelect.tsx";
import HButton from "@celestia-island/hikari/components/HkButton.tsx";
import { useEditorContext } from "../../editor/context";
import type { RoadType } from "../../domain/roadIdentity";
const { roadTable } = useEditorContext();
const { opened, draft } = toRefs(roadTable);
const rows = computed(() => draft.value.map((r, id) => ({ ...r, id })));
const columns = [
  { key: "name", title: "道路名称" },
  { key: "province", title: "省份（可选）" },
  { key: "city", title: "城市（可选）" },
  { key: "code", title: "道路编号" },
  { key: "type", title: "类型" },
  { key: "actions", title: "操作" },
];
const types = [
  { value: "", label: "自动" },
  { value: "nationalExpressway", label: "国家高速" },
  { value: "provincialExpressway", label: "省高速" },
  { value: "national", label: "国道" },
  { value: "provincial", label: "省道" },
  { value: "county", label: "县道" },
  { value: "township", label: "乡道" },
];
</script>
<template>
  <HModal v-model="opened" title="道路编号表" width="xl">
    <div class="road-table-actions">
      <HButton
        :disabled="roadTable.busy || !roadTable.canScan"
        @click="roadTable.scan"
        >识别整条路线</HButton
      ><HButton v-if="roadTable.busy" @click="roadTable.cancel"
        >取消识别</HButton
      ><HButton @click="roadTable.add">添加道路</HButton
      ><span
        v-if="roadTable.busy || roadTable.processed"
        class="muted"
        role="status"
        >已查询 {{ roadTable.processed }} 个位置</span
      >
    </div>
    <p class="muted">
      按道路名称和省市匹配；编号留空时不显示编号牌。整条路线识别会向高德查询采样位置，可随时取消。
    </p>
    <div class="road-table-content">
      <div class="road-table-grid">
        <HTable
          :columns="columns"
          :rows="rows"
          row-key="id"
          :copy-cells="false"
          empty-text="暂未发现道路，可识别路线或手动添加。"
        >
          <template #cell-name="{ index }"
            ><HInput
              aria-label="道路名称"
              :maxlength="200"
              v-model="draft[index].name"
          /></template>
          <template #cell-province="{ index }"
            ><HInput
              aria-label="省份"
              :maxlength="100"
              v-model="draft[index].province"
          /></template>
          <template #cell-city="{ index }"
            ><HInput
              aria-label="城市"
              :maxlength="100"
              v-model="draft[index].city"
          /></template>
          <template #cell-code="{ index }"
            ><HInput
              aria-label="道路编号"
              placeholder="如 G15"
              :maxlength="5"
              :model-value="draft[index].code"
              @update:model-value="
                draft[index].code = String($event).toUpperCase()
              "
          /></template>
          <template #cell-type="{ index }"
            ><HSelect
              aria-label="道路类型"
              :options="types"
              :model-value="draft[index].type ?? ''"
              @update:model-value="
                draft[index].type = ($event || undefined) as
                  | RoadType
                  | undefined
              "
          /></template>
          <template #cell-actions="{ index }"
            ><HButton variant="ghost" @click="draft.splice(index, 1)"
              >删除</HButton
            ></template
          >
        </HTable>
      </div>
    </div>
    <template #footer
      ><HButton variant="ghost" @click="opened = false">取消</HButton
      ><HButton :disabled="roadTable.busy" @click="roadTable.save"
        >应用</HButton
      ></template
    >
  </HModal>
</template>
