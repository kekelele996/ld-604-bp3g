<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useSparePartUsageStore } from "../stores/SparePartUsageStore";
import { useRepairTicketStore } from "../stores/RepairTicketStore";
import { useAuthStore } from "../stores/AuthStore";
import type { ApiError } from "../api/http";
import StatusBadge from "../components/common/StatusBadge.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { UsageStatusText, InventoryChangeTypeText } from "../constants/UsageStatus";
import { formatDate } from "../utils/formatters";

const partStore = useSparePartUsageStore();
const ticketStore = useRepairTicketStore();
const auth = useAuthStore();

const tab = ref<"pending" | "usages" | "inventory">("pending");
const partFilter = ref("");

onMounted(async () => {
  await Promise.all([partStore.load(), ticketStore.load()]);
});

const pendingRows = computed(() => partStore.usages.filter((u) => u.usage_status === "PENDING"));
const canReview = computed(() => auth.can(["WAREHOUSE"]));

const filteredTransactions = computed(() =>
  partFilter.value
    ? partStore.transactions.filter((t) => t.part_code === partFilter.value)
    : partStore.transactions
);

async function approve(id: number) {
  try {
    await partStore.approve(id);
    ElMessage.success("已批准领用");
  } catch (err) {
    ElMessage.error((err as ApiError).message);
    await partStore.load();
  }
}

async function reject(id: number) {
  try {
    const { value } = await ElMessageBox.prompt("驳回后库存将整笔回补并写入库存流水，请填写原因", "驳回领用", {
      confirmButtonText: "确认驳回",
      cancelButtonText: "取消",
      inputValue: "型号不符",
      inputValidator: (v) => (v && v.trim() ? true : "请填写驳回原因")
    });
    await partStore.reject(id, value);
    ElMessage.warning("已驳回，库存已回补");
  } catch (err) {
    if ((err as string) === "cancel") return;
    ElMessage.error((err as ApiError).message ?? "操作失败");
    await partStore.load();
  }
}

function ticketStatus(id: number) {
  return ticketStore.rows.find((t) => t.id === id)?.status ?? "";
}
</script>

<template>
  <section v-loading="partStore.loading">
    <header>
      <h1 class="page-title">备件领用</h1>
      <p class="page-sub">备件申请、审批/驳回、库存余额与库存流水（重启后与事务结果一致）</p>
    </header>

    <el-tabs v-model="tab" class="page-section">
      <!-- 待审批 -->
      <el-tab-pane name="pending">
        <template #label>
          待审批 <el-badge :value="pendingRows.length" :hidden="pendingRows.length === 0" type="danger" />
        </template>
        <el-card shadow="never">
          <el-table :data="pendingRows" empty-text="">
            <template #empty><EmptyState text="没有待审批的领用申请" /></template>
            <el-table-column prop="id" label="#" width="60" />
            <el-table-column prop="ticket_id" label="工单号" width="90" />
            <el-table-column label="工单状态" width="100">
              <template #default="{ row }">
                <StatusBadge v-if="ticketStatus(row.ticket_id)" :value="ticketStatus(row.ticket_id)" kind="ticket" />
              </template>
            </el-table-column>
            <el-table-column prop="part_code" label="备件编码" width="150" />
            <el-table-column prop="part_name" label="备件名称" min-width="160" />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column prop="warehouse_name" label="仓库" width="110" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }"><StatusBadge :value="row.usage_status" kind="usage" /></template>
            </el-table-column>
            <el-table-column label="申请时间" width="170">
              <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="success" :disabled="!canReview" @click="approve(row.id)">批准</el-button>
                <el-button size="small" type="danger" plain :disabled="!canReview" @click="reject(row.id)">驳回</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 全部领用 -->
      <el-tab-pane label="全部领用记录" name="usages">
        <el-card shadow="never">
          <el-table :data="partStore.usages" size="small" empty-text="">
            <template #empty><EmptyState text="暂无领用记录（派工时自动生成）" /></template>
            <el-table-column prop="id" label="#" width="60" />
            <el-table-column prop="ticket_id" label="工单号" width="90" />
            <el-table-column prop="part_code" label="备件编码" width="150" />
            <el-table-column prop="part_name" label="备件名称" min-width="160" />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.usage_status === 'APPROVED' ? 'success' : row.usage_status === 'REJECTED' ? 'danger' : 'warning'">
                  {{ UsageStatusText[row.usage_status as keyof typeof UsageStatusText] ?? row.usage_status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="审批人" width="90">
              <template #default="{ row }">{{ row.approved_by ? `#${row.approved_by}` : "—" }}</template>
            </el-table-column>
            <el-table-column label="审批时间" width="170">
              <template #default="{ row }">{{ formatDate(row.approved_at) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 库存 + 流水 -->
      <el-tab-pane label="库存与流水" name="inventory">
        <div class="two-col">
          <el-card shadow="never">
            <template #header><strong>备件库存</strong></template>
            <el-table :data="partStore.parts" size="small" empty-text="">
              <template #empty><EmptyState text="暂无备件台账" /></template>
              <el-table-column prop="part_code" label="编码" width="150" />
              <el-table-column prop="part_name" label="名称" min-width="150" />
              <el-table-column prop="warehouse_name" label="仓库" width="110" />
              <el-table-column label="库存余额" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.stock_quantity <= 3 ? 'danger' : 'success'">{{ row.stock_quantity }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <el-card shadow="never">
            <template #header>
              <div class="toolbar">
                <strong>库存流水</strong>
                <el-select v-model="partFilter" placeholder="全部备件" clearable size="small" style="width: 200px">
                  <el-option v-for="p in partStore.parts" :key="p.part_code" :label="p.part_code" :value="p.part_code" />
                </el-select>
              </div>
            </template>
            <el-table :data="filteredTransactions" size="small" max-height="420" empty-text="">
              <template #empty><EmptyState text="暂无库存流水" /></template>
              <el-table-column prop="part_code" label="备件" width="140" />
              <el-table-column label="类型" width="130">
                <template #default="{ row }">
                  <el-tag size="small" :type="row.change_type === 'REJECT_RETURN' ? 'success' : 'warning'" effect="plain">
                    {{ InventoryChangeTypeText[row.change_type] ?? row.change_type }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="quantity" label="变动" width="80">
                <template #default="{ row }">
                  <span :style="{ color: row.quantity < 0 ? 'var(--el-color-danger)' : 'var(--el-color-success)' }">
                    {{ row.quantity > 0 ? "+" : "" }}{{ row.quantity }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="balance_after" label="变动后余额" width="100" />
              <el-table-column prop="ticket_id" label="工单" width="70">
                <template #default="{ row }">{{ row.ticket_id ? `#${row.ticket_id}` : "—" }}</template>
              </el-table-column>
              <el-table-column label="时间" min-width="160">
                <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
              </el-table-column>
              <el-table-column prop="remark" label="备注" min-width="140" />
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>
