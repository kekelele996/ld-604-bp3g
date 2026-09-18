<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { useSparePartUsageStore } from "../stores/SparePartUsageStore";
import { useAuthStore } from "../stores/authStore";
import { can } from "../constants/Role";
import { PartUsageStatus } from "../constants/PartUsageStatus";
import { PART_USAGE_STATUS_TEXT } from "../constants/statusText";
import type { ApiError } from "../api/http";
import StatusBadge from "../components/common/StatusBadge.vue";
import ApprovalPanel from "../components/common/ApprovalPanel.vue";
import EmptyState from "../components/common/EmptyState.vue";
import FilterBar from "../components/common/FilterBar.vue";

const store = useSparePartUsageStore();
const authStore = useAuthStore();
const filterStatus = ref("");
const showTransactions = ref(false);

const statusOptions = PartUsageStatus.map((s) => ({ value: s, label: PART_USAGE_STATUS_TEXT[s] }));

async function approve(id: number) {
  try {
    await store.approve(id);
    ElMessage.success("审批通过，库存已扣减并写入流水");
  } catch (e) {
    const err = e as ApiError;
    ElMessage.error(err.code === "PART_ALREADY_APPROVED"
      ? "该申请已被审批（重复审批仅第一次生效）"
      : err.code === "PART_STOCK_INSUFFICIENT"
        ? `${err.message}：未扣库存、未写流水`
        : err.message);
    await store.load();
  }
}

async function reject(id: number, reason: string) {
  try {
    await store.reject(id, reason);
    ElMessage.success("已驳回");
  } catch (e) {
    ElMessage.error((e as ApiError).message);
  }
}

onMounted(async () => {
  await store.load();
});
</script>

<template>
  <section class="stack">
    <div class="toolbar">
      <FilterBar :options="statusOptions" v-model="filterStatus" label="领用状态" />
      <button class="btn btn-ghost btn-sm" :class="{ active: showTransactions }" @click="showTransactions = !showTransactions; showTransactions && store.loadTransactions()">
        {{ showTransactions ? "隐藏库存流水" : "查看库存流水" }}
      </button>
      <button class="btn btn-ghost btn-sm" @click="store.load()">刷新</button>
    </div>

    <div v-if="showTransactions" class="panel">
      <h2>备件库存流水（重启后仍可逐笔核对结存）</h2>
      <table class="table">
        <thead><tr><th>#</th><th>备件</th><th>变动</th><th>结存</th><th>类型</th><th>申请/工单</th><th>备注</th></tr></thead>
        <tbody>
          <tr v-for="tx in store.transactions" :key="tx.id">
            <td>{{ tx.id }}</td>
            <td>{{ tx.part_code }}</td>
            <td :class="tx.change_qty < 0 ? 'danger-text' : 'success-text'">{{ tx.change_qty > 0 ? "+" : "" }}{{ tx.change_qty }}</td>
            <td>{{ tx.balance_after }}</td>
            <td>{{ tx.tx_type }}</td>
            <td>{{ tx.usage_id ? `申请#${tx.usage_id}` : "" }} {{ tx.ticket_id ? `工单#${tx.ticket_id}` : "" }}</td>
            <td>{{ tx.remark ?? "—" }}</td>
          </tr>
        </tbody>
      </table>
      <EmptyState v-if="store.transactions.length === 0" text="暂无库存流水" />
    </div>

    <div class="panel">
      <h2>备件领用 / 审批</h2>
      <table class="table">
        <thead><tr><th>#</th><th>工单</th><th>备件</th><th>数量</th><th>仓库</th><th>当前库存</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="u in store.rows.filter((r) => !filterStatus || r.usageStatus === filterStatus)" :key="u.id">
            <td>{{ u.id }}</td>
            <td>#{{ u.ticketId }}</td>
            <td>{{ u.partCode }}<br /><small class="muted">{{ u.partName }}</small></td>
            <td>{{ u.quantity }}</td>
            <td>{{ u.warehouseName }}</td>
            <td :class="{ 'danger-text': u.currentStock < u.quantity }">{{ u.currentStock }}</td>
            <td><StatusBadge :value="u.usageStatus" :text="u.usageStatusText" /></td>
            <td class="actions">
              <ApprovalPanel :usage-id="u.id" :status="u.usageStatus" @approve="approve" @reject="reject" />
              <button v-if="['APPROVED','CONSUMED'].includes(u.usageStatus) && can(authStore.role, 'returnPart')" class="btn btn-ghost btn-sm" @click="store.returnPart(u.id)">归还入库</button>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState v-if="store.rows.length === 0" text="暂无备件领用记录" />
    </div>

    <div class="panel">
      <h2>备件目录库存</h2>
      <table class="table">
        <thead><tr><th>编码</th><th>名称</th><th>仓库</th><th>结存</th><th>安全库存</th></tr></thead>
        <tbody>
          <tr v-for="p in store.catalog" :key="p.part_code" :class="{ low: p.stock <= p.safety_stock }">
            <td>{{ p.part_code }}</td><td>{{ p.part_name }}</td><td>{{ p.warehouse_name }}</td>
            <td :class="{ 'danger-text': p.stock <= 0 }">{{ p.stock }}</td><td>{{ p.safety_stock }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
