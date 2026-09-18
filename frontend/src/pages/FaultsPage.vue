<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useFaultReportStore } from "../stores/FaultReportStore";
import { useGridAssetStore } from "../stores/GridAssetStore";
import { useAuthStore } from "../stores/authStore";
import { can } from "../constants/Role";
import { FaultType } from "../constants/FaultType";
import { Severity } from "../constants/Severity";
import { FAULT_TYPE_TEXT, SEVERITY_TEXT, FAULT_STATUS_TEXT } from "../constants/statusText";
import type { ApiError } from "../api/http";
import PriorityTag from "../components/common/PriorityTag.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import FilterBar from "../components/common/FilterBar.vue";
import EmptyState from "../components/common/EmptyState.vue";

const store = useFaultReportStore();
const assetStore = useGridAssetStore();
const authStore = useAuthStore();

const dialogVisible = ref(false);
const form = reactive({
  reporter_name: "",
  phone: "",
  asset_id: null as number | null,
  fault_type: "OUTAGE" as string,
  address_desc: "",
  severity: "MEDIUM" as string,
  report_channel: "HOTLINE",
});

const severityOptions = Severity.map((s) => ({ value: s, label: SEVERITY_TEXT[s] }));

async function submitReport() {
  try {
    await store.register({ ...form });
    ElMessage.success("报修已登记，可生成待派工工单");
    dialogVisible.value = false;
    Object.assign(form, { reporter_name: "", phone: "", asset_id: null, fault_type: "OUTAGE", address_desc: "", severity: "MEDIUM" });
  } catch (e) {
    ElMessage.error((e as ApiError).message);
  }
}

async function createTicket(id: number) {
  try {
    const res = await store.createTicket(id);
    ElMessage.success(`已生成工单 #${res.ticketId}`);
  } catch (e) {
    ElMessage.error((e as ApiError).message);
  }
}

async function merge(rowId: number) {
  try {
    const { value } = await ElMessageBox.prompt("输入要合并到的主报修 ID", "合并重复报修", { inputPattern: /^\d+$/, inputErrorMessage: "请输入数字 ID" });
    await store.merge(rowId, Number(value));
    ElMessage.success("已标记为重复报修并合并");
  } catch (e) {
    if (e !== "cancel" && (e as ApiError)?.message) ElMessage.error((e as ApiError).message);
  }
}

onMounted(async () => {
  await Promise.all([store.load(), assetStore.loadFeederLines()]);
});
</script>

<template>
  <section class="stack">
    <div class="toolbar">
      <FilterBar :options="severityOptions" :model-value="store.filterSeverity" @update:model-value="store.filterSeverity = $event" label="严重度" />
      <FilterBar
        :options="[
          { value: 'WAIT_DISPATCH', label: '待派工' },
          { value: 'TICKET_CREATED', label: '已生成工单' },
          { value: 'DUPLICATED', label: '重复报修' },
        ]"
        :model-value="store.filterStatus"
        @update:model-value="store.filterStatus = $event"
        label="报修状态"
      />
      <button v-if="can(authStore.role, 'createFault')" class="btn btn-primary btn-sm" @click="dialogVisible = true">登记报修</button>
      <button class="btn btn-ghost btn-sm" @click="store.load()">刷新</button>
    </div>

    <div class="panel">
      <table class="table">
        <thead>
          <tr><th>#</th><th>报修人</th><th>故障类型</th><th>严重度/优先级</th><th>地址</th><th>渠道</th><th>状态</th><th>工单</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="f in store.rows" :key="f.id" :class="{ dimmed: f.status === 'DUPLICATED' }">
            <td>{{ f.id }}</td>
            <td>{{ f.reporterName }}<br /><small class="muted">{{ f.phone }}</small></td>
            <td>{{ f.faultTypeText }}<br /><small class="muted">{{ f.assetCode ?? "无资产" }}</small></td>
            <td><PriorityTag :severity="f.severity" /></td>
            <td>{{ f.addressDesc ?? "—" }}</td>
            <td>{{ f.reportChannel }}</td>
            <td>
              <StatusBadge :value="f.status" :text="FAULT_STATUS_TEXT[f.status] ?? f.status" />
              <div v-if="f.mergedIntoId" class="muted">合并至 #{{ f.mergedIntoId }}</div>
            </td>
            <td>{{ f.ticketId ? `#${f.ticketId}` : "—" }}</td>
            <td class="actions">
              <button v-if="f.status === 'WAIT_DISPATCH' && can(authStore.role, 'createTicket')" class="btn btn-primary btn-sm" @click="createTicket(f.id)">生成工单</button>
              <button v-if="f.status !== 'DUPLICATED' && can(authStore.role, 'merge')" class="btn btn-ghost btn-sm" @click="merge(f.id)">合并重复</button>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState v-if="store.rows.length === 0" text="暂无报修记录" />
    </div>

    <el-dialog v-model="dialogVisible" title="登记故障报修" width="520px">
      <div class="form-stack">
        <label class="field"><span>报修人</span><input v-model="form.reporter_name" class="input" /></label>
        <label class="field"><span>联系电话</span><input v-model="form.phone" class="input" /></label>
        <label class="field"><span>关联资产</span>
          <select v-model="form.asset_id" class="input">
            <option :value="null">不关联</option>
          </select>
        </label>
        <label class="field"><span>故障类型</span>
          <select v-model="form.fault_type" class="input">
            <option v-for="t in FaultType" :key="t" :value="t">{{ FAULT_TYPE_TEXT[t] }}</option>
          </select>
        </label>
        <label class="field"><span>严重度</span>
          <select v-model="form.severity" class="input">
            <option v-for="s in Severity" :key="s" :value="s">{{ SEVERITY_TEXT[s] }}</option>
          </select>
        </label>
        <label class="field"><span>地址描述</span><input v-model="form.address_desc" class="input" /></label>
        <label class="field"><span>上报渠道</span>
          <select v-model="form.report_channel" class="input">
            <option value="HOTLINE">热线</option><option value="APP">APP</option><option value="WECHAT">微信</option>
          </select>
        </label>
      </div>
      <template #footer><button class="btn btn-primary" @click="submitReport">提交登记</button></template>
    </el-dialog>
  </section>
</template>
