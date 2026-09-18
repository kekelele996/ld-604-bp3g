<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getDashboardOverview, type DashboardOverview } from "../api/dashboard";
import StatCard from "../components/common/StatCard.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import { TICKET_STATUS_TEXT } from "../constants/statusText";
import { formatMinutes } from "../utils/formatters";

const overview = ref<DashboardOverview | null>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    overview.value = await getDashboardOverview();
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>

<template>
  <section v-loading="loading" class="stack">
    <div class="metric-grid">
      <StatCard label="待派工" :value="overview?.ticketByStatus.WAIT_DISPATCH ?? 0" hint="待调度员派工" />
      <StatCard label="抢修中/到场/已派工"
        :value="(overview?.ticketByStatus.ASSIGNED ?? 0) + (overview?.ticketByStatus.ARRIVED ?? 0) + (overview?.ticketByStatus.REPAIRING ?? 0)"
        hint="在途工单" />
      <StatCard label="已复电" :value="overview?.ticketByStatus.RESTORED ?? 0" />
      <StatCard label="已关闭" :value="overview?.ticketByStatus.CLOSED ?? 0" />
      <StatCard label="值班班组 / 空闲"
        :value="overview ? `${overview.crew.onDuty} / ${overview.crew.idle}` : '—'" />
      <StatCard label="平均复电时长" :value="formatMinutes(overview?.averageRestoreMinutes)" />
      <StatCard label="备件待审批" :value="overview?.pendingPartApprovals ?? 0" hint="仓管待处理" />
    </div>

    <div class="panel-grid">
      <div class="panel">
        <h2>工单状态分布</h2>
        <ul class="dist-list">
          <li v-for="(text, key) in TICKET_STATUS_TEXT" :key="key">
            <StatusBadge :value="key" :text="text" />
            <strong>{{ overview?.ticketByStatus[key] ?? 0 }}</strong>
          </li>
        </ul>
      </div>

      <div class="panel">
        <h2>低库存预警</h2>
        <table v-if="overview && overview.lowStockParts.length" class="table">
          <thead><tr><th>备件</th><th>名称</th><th>结存</th><th>安全库存</th></tr></thead>
          <tbody>
            <tr v-for="p in overview.lowStockParts" :key="p.part_code">
              <td>{{ p.part_code }}</td>
              <td>{{ p.part_name }}</td>
              <td :class="{ 'danger-text': p.stock <= 0 }">{{ p.stock }}</td>
              <td>{{ p.safety_stock }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">暂无低于安全库存的备件</p>
      </div>
    </div>
  </section>
</template>
