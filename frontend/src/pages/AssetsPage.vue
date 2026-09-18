<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useGridAssetStore } from "../stores/GridAssetStore";
import { useFaultReportStore } from "../stores/FaultReportStore";
import type { GridAsset } from "../types/GridAsset";
import AssetTree from "../components/common/AssetTree.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { AssetHealthStatus, AssetHealthStatusText } from "../constants/AssetHealthStatus";

const assetStore = useGridAssetStore();
const faultStore = useFaultReportStore();

const selected = ref<GridAsset | null>(null);
const healthFilter = ref("");

onMounted(async () => {
  await Promise.all([assetStore.load(), faultStore.load()]);
});

const filteredAssets = computed(() =>
  healthFilter.value ? assetStore.rows.filter((a) => a.health_status === healthFilter.value) : assetStore.rows
);

function faultsOf(assetId: number) {
  return faultStore.rows.filter((f) => f.asset_id === assetId);
}
</script>

<template>
  <section v-loading="assetStore.loading">
    <header>
      <h1 class="page-title">配网资产</h1>
      <p class="page-sub">资产台账、线路归属、健康状态与历史故障</p>
    </header>

    <div class="two-col page-section">
      <el-card shadow="never">
        <template #header>
          <div class="toolbar">
            <strong>线路资产树</strong>
            <el-select v-model="healthFilter" placeholder="健康状态" clearable size="small" style="width: 140px">
              <el-option v-for="s in AssetHealthStatus" :key="s" :label="AssetHealthStatusText[s]" :value="s" />
            </el-select>
          </div>
        </template>
        <AssetTree :assets="filteredAssets" :selected-id="selected?.id ?? null" @select="selected = $event" />
      </el-card>

      <el-card shadow="never">
        <template #header><strong>资产详情 / 历史故障</strong></template>
        <EmptyState v-if="!selected" text="在左侧选择一台资产查看详情" />
        <template v-else>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="资产编码">{{ selected.asset_code }}</el-descriptions-item>
            <el-descriptions-item label="资产类型">{{ selected.asset_type }}</el-descriptions-item>
            <el-descriptions-item label="馈线">{{ selected.feeder_line }}</el-descriptions-item>
            <el-descriptions-item label="电压等级">{{ selected.voltage_level }}</el-descriptions-item>
            <el-descriptions-item label="位置">{{ selected.location_desc }}</el-descriptions-item>
            <el-descriptions-item label="健康状态">
              <StatusBadge :value="selected.health_status" kind="health" />
            </el-descriptions-item>
            <el-descriptions-item label="归属班组">#{{ selected.owner_team_id ?? "—" }}</el-descriptions-item>
          </el-descriptions>

          <h3 style="margin: 16px 0 8px; font-size: 14px">历史故障（{{ faultsOf(selected.id).length }}）</h3>
          <el-table :data="faultsOf(selected.id)" size="small" empty-text="">
            <template #empty><EmptyState text="该资产暂无故障记录" /></template>
            <el-table-column prop="id" label="#" width="60" />
            <el-table-column prop="fault_type" label="类型" width="120" />
            <el-table-column prop="severity" label="严重度" width="100" />
            <el-table-column prop="address_desc" label="描述" min-width="140" />
            <el-table-column prop="status" label="状态" width="100" />
          </el-table>
        </template>
      </el-card>
    </div>
  </section>
</template>
