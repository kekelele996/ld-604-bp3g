<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRepairTicketStore } from "../stores/RepairTicketStore";
import { useCrewStore } from "../stores/CrewStore";
import { useSparePartUsageStore } from "../stores/SparePartUsageStore";
import { useAuthStore } from "../stores/authStore";
import { can } from "../constants/Role";
import { TicketStatus, type TicketStatus as TS } from "../constants/TicketStatus";
import { TICKET_STATUS_TEXT } from "../constants/statusText";
import type { ApiError } from "../api/http";
import type { Crew } from "../types/Crew";
import StatusBadge from "../components/common/StatusBadge.vue";
import PriorityTag from "../components/common/PriorityTag.vue";
import CrewCard from "../components/common/CrewCard.vue";
import TimelineList from "../components/common/TimelineList.vue";
import FilterBar from "../components/common/FilterBar.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { TICKET_NEXT } from "../constants/TicketStatus";

const ticketStore = useRepairTicketStore();
const crewStore = useCrewStore();
const partStore = useSparePartUsageStore();
const authStore = useAuthStore();

const statusOptions = TicketStatus.map((s) => ({ value: s, label: TICKET_STATUS_TEXT[s] }));
const selectedTicketId = ref<number | null>(null);

// 派工弹窗
const dispatchDialog = ref(false);
const dispatchTarget = ref<number | null>(null);
const withParts = ref(false);
const partRows = ref<Array<{ partCode: string; quantity: number }>>([{ partCode: "", quantity: 1 }]);
const submitting = ref(false);

// 备件申请弹窗
const partDialog = ref(false);
const partForm = ref({ partCode: "", quantity: 1 });

const detail = computed(() =>
  ticketStore.detail && ticketStore.detail.id === selectedTicketId.value ? ticketStore.detail : null,
);

const dispatchFaultType = computed(() => {
  const t = ticketStore.rows.find((x) => x.id === dispatchTarget.value);
  return t?.faultType;
});

async function refreshDetail() {
  if (selectedTicketId.value != null) {
    await ticketStore.loadDetail(selectedTicketId.value);
  }
}

function openRow(id: number) {
  selectedTicketId.value = id;
  void refreshDetail();
}

async function openDispatch(id: number) {
  dispatchTarget.value = id;
  withParts.value = false;
  partRows.value = [{ partCode: "", quantity: 1 }];
  const faultType = ticketStore.rows.find((t) => t.id === id)?.faultType;
  await crewStore.load(faultType);
  await partStore.load();
  dispatchDialog.value = true;
}

async function confirmDispatch(crew: Crew) {
  if (dispatchTarget.value == null) return;
  submitting.value = true;
  try {
    if (withParts.value) {
      const parts = partRows.value.filter((p) => p.partCode && p.quantity > 0);
      if (parts.length === 0) {
        ElMessage.warning("请至少填写一条有效备件，或关闭“派工同时领用”");
        return;
      }
      await ticketStore.dispatchParts(dispatchTarget.value, crew.id, parts);
      ElMessage.success("派工并领用成功，库存已扣减");
    } else {
      await ticketStore.dispatch(dispatchTarget.value, crew.id);
      ElMessage.success("派工成功");
    }
    dispatchDialog.value = false;
    await Promise.all([ticketStore.load(), crewStore.load(dispatchFaultType.value)]);
  } catch (e) {
    const err = e as ApiError;
    ElMessage.error(`${err.message}${err.code === "PART_STOCK_INSUFFICIENT" ? "（派工/占用/领用已全部回滚）" : ""}`);
    await ticketStore.load();
  } finally {
    submitting.value = false;
  }
}

async function advance(t: { id: number; status: TS; version: number }) {
  const next = TICKET_NEXT[t.status];
  if (!next) return;
  try {
    await ElMessageBox.confirm(`确认将工单 #${t.id} 推进到「${TICKET_STATUS_TEXT[next]}」？`, "状态推进", { type: "warning" });
  } catch { return; }
  try {
    await ticketStore.advance(t.id, next, t.version);
    ElMessage.success(`已推进至「${TICKET_STATUS_TEXT[next]}」`);
    await refreshDetail();
  } catch (e) {
    const err = e as ApiError;
    ElMessage.error(err.code === "TICKET_INVALID_TRANSITION" || err.code === "TICKET_VERSION_CONFLICT"
      ? "状态已被其他操作更新，请刷新后重试（仅成功一次）" : err.message);
    await ticketStore.load();
    await refreshDetail();
  }
}

function openPartApply(id: number) {
  partForm.value = { partCode: "", quantity: 1 };
  selectedTicketId.value = id;
  partDialog.value = true;
  void partStore.load();
}

async function submitPartApply() {
  if (selectedTicketId.value == null) return;
  if (!partForm.value.partCode || partForm.value.quantity <= 0) {
    ElMessage.warning("请选择备件并填写数量");
    return;
  }
  try {
    await ticketStore.applyPart(selectedTicketId.value, partForm.value.partCode, partForm.value.quantity);
    ElMessage.success("备件申请已提交，等待仓管审批");
    partDialog.value = false;
  } catch (e) {
    ElMessage.error((e as ApiError).message);
  }
}

watch(() => ticketStore.filterStatus, () => ticketStore.load());
onMounted(async () => {
  await ticketStore.load();
  await crewStore.load();
});
</script>

<template>
  <section class="stack">
    <div class="toolbar">
      <FilterBar :options="statusOptions" :model-value="ticketStore.filterStatus" @update:model-value="ticketStore.filterStatus = $event" label="工单状态" />
      <button class="btn btn-ghost btn-sm" @click="ticketStore.load()">刷新</button>
    </div>

    <div class="split">
      <div class="panel table-panel">
        <table class="table">
          <thead>
            <tr><th>#</th><th>优先级</th><th>故障</th><th>严重度</th><th>状态</th><th>班组</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="t in ticketStore.rows" :key="t.id" :class="{ active: t.id === selectedTicketId }" @click="openRow(t.id)">
              <td>{{ t.id }}</td>
              <td><PriorityTag :priority="t.priority" /></td>
              <td>{{ t.faultType }}<br /><small class="muted">{{ t.reporterName }}</small></td>
              <td>{{ t.severity }}</td>
              <td><StatusBadge :value="t.status" :text="t.statusText" /></td>
              <td>{{ t.teamName ?? "—" }}</td>
              <td class="actions" @click.stop>
                <button v-if="t.status === 'WAIT_DISPATCH' && can(authStore.role, 'dispatch')" class="btn btn-primary btn-sm" @click="openDispatch(t.id)">派工</button>
                <button v-if="['ARRIVED','REPAIRING','RESTORED'].includes(t.status) && can(authStore.role, 'applyPart')" class="btn btn-ghost btn-sm" @click="openPartApply(t.id)">申请备件</button>
                <button v-if="TICKET_NEXT[t.status] && can(authStore.role, 'advance')" class="btn btn-default btn-sm" @click="advance(t)">
                  {{ t.status === 'ASSIGNED' ? '确认到场' : t.status === 'ARRIVED' ? '开始抢修' : t.status === 'REPAIRING' ? '确认复电' : '关闭工单' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="!ticketStore.loading && ticketStore.rows.length === 0" text="没有符合条件的工单" />
      </div>

      <div class="panel detail-panel" v-if="detail">
        <h2>工单 #{{ detail.id }} 流转时间轴</h2>
        <p class="muted">派工时间 {{ detail.assignedAt ?? "—" }} · 复电耗时 {{ detail.restoreMinutes ?? "—" }} 分钟</p>
        <TimelineList :events="detail.events ?? []" />
      </div>
      <div class="panel detail-panel" v-else><EmptyState text="选择左侧工单查看流转时间轴" /></div>
    </div>

    <!-- 派工弹窗：仅值班空闲且技能匹配的班组可点 -->
    <el-dialog v-model="dispatchDialog" :title="`派工：工单 #${dispatchTarget ?? ''}`" width="760px">
      <label class="inline-check">
        <input type="checkbox" v-model="withParts" /> 派工同时领用备件（库存不足将整体回滚，不产生任何派工/占用/领用记录）
      </label>
      <div v-if="withParts" class="part-rows">
        <div v-for="(row, i) in partRows" :key="i" class="part-row">
          <select v-model="row.partCode" class="input">
            <option value="" disabled>选择备件</option>
            <option v-for="p in partStore.catalog" :key="p.part_code" :value="p.part_code">
              {{ p.part_code }} {{ p.part_name }}（库存 {{ p.stock }}）
            </option>
          </select>
          <input type="number" min="1" v-model.number="row.quantity" class="input" style="width:110px" />
        </div>
      </div>
      <div class="crew-grid">
        <CrewCard
          v-for="c in crewStore.rows"
          :key="c.id"
          :crew="c"
          :required-fault-type="dispatchFaultType"
          selectable
          @select="confirmDispatch"
        />
      </div>
      <p v-if="crewStore.rows.length === 0" class="muted">暂无可选班组</p>
    </el-dialog>

    <!-- 备件申请弹窗 -->
    <el-dialog v-model="partDialog" title="接单后申请备件" width="480px">
      <div class="form-stack">
        <label class="field"><span>备件</span>
          <select v-model="partForm.partCode" class="input">
            <option value="" disabled>选择备件</option>
            <option v-for="p in partStore.catalog" :key="p.part_code" :value="p.part_code">
              {{ p.part_code }} {{ p.part_name }}（库存 {{ p.stock }} / {{ p.warehouse_name }}）
            </option>
          </select>
        </label>
        <label class="field"><span>数量</span><input type="number" min="1" v-model.number="partForm.quantity" class="input" /></label>
      </div>
      <template #footer>
        <button class="btn btn-primary" :disabled="submitting" @click="submitPartApply">提交申请（待审批）</button>
      </template>
    </el-dialog>
  </section>
</template>
