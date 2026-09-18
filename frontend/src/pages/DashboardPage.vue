<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRepairTicketStore } from "../stores/RepairTicketStore";
import { useCrewStore } from "../stores/CrewStore";
import { useFaultReportStore } from "../stores/FaultReportStore";
import { useSparePartUsageStore } from "../stores/SparePartUsageStore";
import StatCard from "../components/common/StatCard.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import PriorityTag from "../components/common/PriorityTag.vue";
import CrewCard from "../components/common/CrewCard.vue";
import { formatDurationMinutes, formatDate } from "../utils/formatters";
import { TICKET_STATUS_FLOW } from "../constants/TicketStatus";

const tickets = useRepairTicketStore();
const crews = useCrewStore();
const faults = useFaultReportStore();
const parts = useSparePartUsageStore();

onMounted(async () => {
  await Promise.all([tickets.load(), crews.load(), faults.load(), parts.load()]);
});

const loading = computed(() => tickets.loading || crews.loading);

/** 抢修进度：各状态工单数量（按状态机顺序） */
const progressSteps = computed(() =>
  (Object.keys(TICKET_STATUS_FLOW) as Array<keyof typeof TICKET_STATUS_FLOW>).map((status) => ({
    status,
    count: tickets.rows.filter((t) => t.status === status).length
  }))
);

const activeTickets = computed(() =>
  tickets.rows.filter((t) => ["ASSIGNED", "ARRIVED", "REPAIRING"].includes(t.status))
);

const maxStepCount = computed(() => Math.max(1, ...progressSteps.value.map((s) => s.count)));

function faultSeverity(ticket: { priority: string | null }) {
  return ticket.priority ?? "MINOR";
}
</script>

<template>
  <section v-loading="loading">
    <header>
      <h1 class="page-title">抢修态势</h1>
      <p class="page-sub">待派工数量、抢修进度、班组状态与平均复电时间（数据来自本地数据库）</p>
    </header>

    <div class="metric-grid page-section">
      <StatCard label="待派工工单" :value="tickets.waitingCount" tone="danger" hint="按故障严重度危急优先" />
      <StatCard label="抢修中工单" :value="tickets.activeCount" tone="warning" hint="已派工/到场/抢修中" />
      <StatCard label="待审批领用" :value="parts.pendingUsages.length" tone="warning" hint="备件申请等待仓管审批" />
      <StatCard label="平均复电时长" :value="formatDurationMinutes(tickets.averageRestoreMs)" tone="success" hint="派工至复电确认" />
    </div>

    <div class="two-col page-section">
      <el-card shadow="never">
        <template #header>
          <div class="toolbar">
            <strong>抢修进度（状态机）</strong>
            <el-tag effect="plain" round>共 {{ tickets.rows.length }} 张工单</el-tag>
          </div>
        </template>
        <div class="progress-list">
          <div v-for="step in progressSteps" :key="step.status" class="progress-row">
            <StatusBadge :value="step.status" kind="ticket" />
            <el-progress
              :percentage="Math.round((step.count / maxStepCount) * 100)"
              :stroke-width="14"
              :show-text="false"
              style="flex: 1"
            />
            <span class="progress-count">{{ step.count }}</span>
          </div>
        </div>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="toolbar">
            <strong>班组状态</strong>
            <el-tag type="success" effect="plain" round>值班 {{ crews.onDutyCount }}</el-tag>
            <el-tag type="info" effect="plain" round>空闲 {{ crews.idleCount }}</el-tag>
          </div>
        </template>
        <div class="crew-grid">
          <CrewCard v-for="crew in crews.rows" :key="crew.id" :crew="crew" />
        </div>
      </el-card>
    </div>

    <el-card class="page-section" shadow="never">
      <template #header>
        <strong>在修工单（已派工 / 到场 / 抢修中）</strong>
      </template>
      <el-table :data="activeTickets" size="small" empty-text="暂无在修工单">
        <el-table-column prop="id" label="#" width="64" />
        <el-table-column label="严重度" width="100">
          <template #default="{ row }"><PriorityTag :value="faultSeverity(row)" /></template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><StatusBadge :value="row.status" kind="ticket" /></template>
        </el-table-column>
        <el-table-column label="承接班组" width="120">
          <template #default="{ row }">
            {{ crews.rows.find((c) => c.id === row.team_id)?.name ?? `#${row.team_id ?? "-"}` }}
          </template>
        </el-table-column>
        <el-table-column label="派工时间">
          <template #default="{ row }">{{ formatDate(row.assigned_at) }}</template>
        </el-table-column>
        <el-table-column label="报修单号" prop="fault_report_id" width="110" />
      </el-table>
    </el-card>
  </section>
</template>

<style scoped>
.progress-list { display: grid; gap: 12px; }
.progress-row { display: flex; align-items: center; gap: 12px; }
.progress-count { width: 28px; text-align: right; font-weight: 700; }
.crew-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
</style>
