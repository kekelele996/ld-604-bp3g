<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRepairTicketStore } from "../stores/RepairTicketStore";
import { useCrewStore } from "../stores/CrewStore";
import { useSparePartUsageStore } from "../stores/SparePartUsageStore";
import { useAuthStore } from "../stores/AuthStore";
import type { ApiError } from "../api/http";
import type { RepairTicket, TicketEvent } from "../types/RepairTicket";
import StatusBadge from "../components/common/StatusBadge.vue";
import PriorityTag from "../components/common/PriorityTag.vue";
import TimelineList from "../components/common/TimelineList.vue";
import EmptyState from "../components/common/EmptyState.vue";
import DispatchDialog from "../components/ticket/DispatchDialog.vue";
import { TicketStatus, TicketStatusText, TICKET_STATUS_FLOW, type TicketStatus as Status } from "../constants/TicketStatus";
import { UsageStatusText } from "../constants/UsageStatus";
import { formatDate } from "../utils/formatters";
import { getTicketTimeline } from "../api/RepairTicket";

const ticketStore = useRepairTicketStore();
const crewStore = useCrewStore();
const partStore = useSparePartUsageStore();
const auth = useAuthStore();

const statusFilter = ref<Status | "">("");
const dispatchTarget = ref<RepairTicket | null>(null);
const dispatchVisible = ref(false);
const timelineTicket = ref<RepairTicket | null>(null);
const timelineItems = ref<TicketEvent[]>([]);
const timelineVisible = ref(false);

onMounted(loadAll);

async function loadAll() {
  await Promise.all([ticketStore.load(), crewStore.load(), partStore.load()]);
}

const filteredTickets = computed(() => {
  const rows = statusFilter.value ? ticketStore.rows.filter((t) => t.status === statusFilter.value) : ticketStore.rows;
  const rank: Record<string, number> = { CRITICAL: 0, MAJOR: 1, MINOR: 2 };
  return rows.slice().sort((a, b) => (rank[a.priority ?? "MINOR"] ?? 2) - (rank[b.priority ?? "MINOR"] ?? 2) || b.id - a.id);
});

function crewName(id: number | null): string {
  if (id === null) return "—";
  return crewStore.rows.find((c) => c.id === id)?.name ?? `班组 #${id}`;
}

function usagesOf(ticketId: number) {
  return partStore.usages.filter((u) => u.ticket_id === ticketId);
}

function openDispatch(ticket: RepairTicket) {
  dispatchTarget.value = ticket;
  dispatchVisible.value = true;
}

async function handleDispatch(payload: { teamId: number; parts: Array<{ part_code: string; quantity: number }> }) {
  if (!dispatchTarget.value) return;
  try {
    await ticketStore.dispatch(dispatchTarget.value.id, payload.teamId, payload.parts);
    ElMessage.success("派工成功：班组已占用，库存已预留并生成领用记录");
    dispatchVisible.value = false;
    await loadAll();
  } catch (err) {
    const e = err as ApiError;
    // 库存不足/班组被抢/并发重复派工均为 409：提示用户刷新，数据以后端事务结果为准
    ElMessage.error(e.message);
    await loadAll();
    if (e.status !== 409) dispatchVisible.value = false;
  }
}

async function advance(ticket: RepairTicket) {
  const next = TICKET_STATUS_FLOW[ticket.status];
  if (!next) return;
  const isClose = next === "CLOSED";
  try {
    if (isClose) {
      await ElMessageBox.confirm(`确认关闭工单 #${ticket.id}？关闭后承接班组将被释放。`, "关闭工单", {
        type: "warning",
        confirmButtonText: "确认关闭",
        cancelButtonText: "取消"
      });
    }
    if (next === "ARRIVED") await ticketStore.advance(ticket.id, "ARRIVED");
    else if (next === "REPAIRING") await ticketStore.advance(ticket.id, "REPAIRING");
    else if (next === "RESTORED") await ticketStore.advance(ticket.id, "RESTORED");
    else if (next === "CLOSED") await ticketStore.close(ticket.id);
    ElMessage.success(`工单已推进至「${TicketStatusText[next]}」`);
    await loadAll();
  } catch (err) {
    if (err === "cancel" || (err as { message?: string })?.message === "cancel") return;
    const e = err as ApiError;
    ElMessage.error(e.message ?? "操作失败");
    await loadAll();
  }
}

async function openTimeline(ticket: RepairTicket) {
  timelineTicket.value = ticket;
  timelineItems.value = await getTicketTimeline(ticket.id);
  timelineVisible.value = true;
}

function actionLabel(status: Status): string {
  return { ASSIGNED: "到场", ARRIVED: "开始抢修", REPAIRING: "复电确认", RESTORED: "关闭工单" }[status as "ASSIGNED" | "ARRIVED" | "REPAIRING" | "RESTORED"] ?? "";
}

/** 班组可执行到场/抢修/复电；关闭仅调度员 */
function canAct(ticket: RepairTicket): boolean {
  if (ticket.status === "RESTORED") return auth.can(["DISPATCHER"]);
  return auth.can(["CREW_LEADER", "DISPATCHER"]);
}

const statusOptions = TicketStatus.map((value) => ({ value, label: TicketStatusText[value] }));
const nextActionText = TicketStatusText;
</script>

<template>
  <section v-loading="ticketStore.loading">
    <header class="toolbar" style="justify-content: space-between">
      <div>
        <h1 class="page-title">抢修工单</h1>
        <p class="page-sub">派工（严重度 × 班组技能）、状态推进、备件领用与复电确认</p>
      </div>
      <div class="toolbar">
        <el-radio-group v-model="statusFilter" size="default">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button v-for="opt in statusOptions" :key="opt.value" :label="opt.value">
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>
        <el-button :icon="undefined" @click="loadAll">刷新</el-button>
      </div>
    </header>

    <el-card class="page-section" shadow="never">
      <el-table :data="filteredTickets" row-key="id" empty-text="">
        <template #empty><EmptyState text="当前筛选下暂无工单" /></template>
        <el-table-column prop="id" label="#" width="60" />
        <el-table-column label="严重度" width="90">
          <template #default="{ row }"><PriorityTag :value="row.priority ?? 'MINOR'" /></template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><StatusBadge :value="row.status" kind="ticket" /></template>
        </el-table-column>
        <el-table-column label="承接班组" min-width="140">
          <template #default="{ row }">{{ crewName(row.team_id) }}</template>
        </el-table-column>
        <el-table-column label="备件领用" min-width="220">
          <template #default="{ row }">
            <template v-if="usagesOf(row.id).length">
              <el-tag
                v-for="u in usagesOf(row.id)"
                :key="u.id"
                size="small"
                effect="plain"
                style="margin: 2px"
              >
                {{ u.part_code }} ×{{ u.quantity }}（{{ UsageStatusText[u.usage_status as keyof typeof UsageStatusText] ?? u.usage_status }}）
              </el-tag>
            </template>
            <span v-else style="color: var(--el-text-color-secondary)">—</span>
          </template>
        </el-table-column>
        <el-table-column label="派工时间" width="170">
          <template #default="{ row }">{{ formatDate(row.assigned_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openTimeline(row)">时间线</el-button>
            <el-button
              v-if="row.status === 'WAIT_DISPATCH'"
              size="small"
              type="primary"
              :disabled="!auth.can(['DISPATCHER'])"
              @click="openDispatch(row)"
            >
              派工
            </el-button>
            <el-button
              v-else-if="nextActionText[row.status as Status] && actionLabel(row.status)"
              size="small"
              :type="row.status === 'RESTORED' ? 'success' : 'primary'"
              :disabled="!canAct(row)"
              @click="advance(row)"
            >
              {{ actionLabel(row.status) }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <DispatchDialog
      v-model:visible="dispatchVisible"
      :ticket="dispatchTarget"
      :crews="crewStore.rows"
      :parts="partStore.parts"
      :acting="ticketStore.actingId !== null"
      @confirm="handleDispatch"
    />

    <el-drawer v-model="timelineVisible" :title="`工单 #${timelineTicket?.id ?? ''} 流转时间线`" size="460px">
      <TimelineList
        :items="timelineItems"
        :status-text-map="TicketStatusText"
      />
      <el-descriptions :column="1" border style="margin-top: 16px" v-if="timelineTicket">
        <el-descriptions-item label="当前状态">
          <StatusBadge :value="timelineTicket.status" kind="ticket" />
        </el-descriptions-item>
        <el-descriptions-item label="承接班组">{{ crewName(timelineTicket.team_id) }}</el-descriptions-item>
        <el-descriptions-item label="派工时间">{{ formatDate(timelineTicket.assigned_at) }}</el-descriptions-item>
        <el-descriptions-item label="到场时间">{{ formatDate(timelineTicket.arrived_at) }}</el-descriptions-item>
        <el-descriptions-item label="复电时间">{{ formatDate(timelineTicket.restored_at) }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </section>
</template>
