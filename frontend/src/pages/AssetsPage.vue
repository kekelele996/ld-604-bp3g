<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useGridAssetStore } from "../stores/GridAssetStore";
import { AssetHealthStatus } from "../constants/AssetHealthStatus";
import { ASSET_HEALTH_TEXT } from "../constants/statusText";
import StatusBadge from "../components/common/StatusBadge.vue";
import AssetTree from "../components/common/AssetTree.vue";
import FilterBar from "../components/common/FilterBar.vue";
import EmptyState from "../components/common/EmptyState.vue";
import type { GridAsset } from "../types/GridAsset";

const store = useGridAssetStore();
const selected = ref<GridAsset | null>(null);

const healthOptions = AssetHealthStatus.map((h) => ({ value: h, label: ASSET_HEALTH_TEXT[h] }));

onMounted(async () => {
  await Promise.all([store.load(), store.loadFeederLines()]);
});

function badgeKind(health: string): string {
  return { NORMAL: "success", WATCH: "info", DEGRADED: "warning", DANGEROUS: "danger" }[health] ?? "info";
}
</script>

<template>
  <section class="stack">
    <div class="toolbar">
      <label class="filter-bar-item">
        <span class="filter-label">馈线</span>
        <select v-model="store.filterLine" class="input input-sm" @change="store.load()">
          <option value="">全部</option>
          <option v-for="line in store.feederLines" :key="line" :value="line">{{ line }}</option>
        </select>
      </label>
      <FilterBar :options="healthOptions" :model-value="store.filterHealth" @update:model-value="(v) => { store.filterHealth = v; store.load(); }" label="健康状态" />
      <button class="btn btn-ghost btn-sm" @click="store.load()">刷新</button>
    </div>

    <div class="split">
      <div class="panel">
        <h2>资产台账</h2>
        <table class="table">
          <thead><tr><th>编码</th><th>类型</th><th>馈线</th><th>健康状态</th><th>历史故障</th></tr></thead>
          <tbody>
            <tr v-for="a in store.rows" :key="a.id" @click="selected = a">
              <td>{{ a.assetCode }}</td>
              <td>{{ a.assetType }}</td>
              <td>{{ a.feederLine }}</td>
              <td><span class="dot" :class="`dot-${badgeKind(a.healthStatus)}`" />{{ a.healthStatusText }}</td>
              <td>{{ a.faultCount }}（未复电 {{ a.openFaultCount }}）</td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="store.rows.length === 0" text="该馈线下暂无资产" />
      </div>
      <div class="panel">
        <h2>馈线资产树</h2>
        <AssetTree :assets="store.rows" @select="selected = $event" />
        <div v-if="selected" class="asset-detail">
          <h3>{{ selected.assetCode }}</h3>
          <p>{{ selected.locationDesc }} · {{ selected.voltageLevel }}</p>
          <p>当前状态：<StatusBadge :value="selected.healthStatus" :text="selected.healthStatusText" /></p>
        </div>
      </div>
    </div>
  </section>
</template>
