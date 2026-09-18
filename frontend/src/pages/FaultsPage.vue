<script setup lang="ts">
import { onMounted, reactive, ref, computed } from "vue";
import { ElMessage } from "element-plus";
import { useFaultReportStore } from "../stores/FaultReportStore";
import { useRepairTicketStore } from "../stores/RepairTicketStore";
import { useAuthStore } from "../stores/AuthStore";
import type { ApiError } from "../api/http";
import StatusBadge from "../components/common/StatusBadge.vue";
import PriorityTag from "../components/common/PriorityTag.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { FaultTypeText, FaultType } from "../constants/FaultType";
import { Severity, SeverityText } from "../constants/Severity";
import { createFaultReportForm } from "../constructors/FaultReportConstructor";

const faultStore = useFaultReportStore();
const ticketStore = useRepairTicketStore();
const auth = useAuthStore();

const dialogVisible = ref(false);
const submitting = ref(false);
const form = reactive(createFaultReportForm());

onMounted(async () => {
  await Promise.all([faultStore.load(), ticketStore.load()]);
});

const faultStatusText: Record<string, string> = { RECEIVED: "已受理", MERGED: "已合并", CONVERTED: "已转工单" };

function openCreate() {
  Object.assign(form, createFaultReportForm());
  dialogVisible.value = true;
}

async function submit() {
  if (!form.reporter_name || !form.address_desc) {
    ElMessage.warning("请填写报修人姓名与故障地址");
    return;
  }
  submitting.value = true;
  try {
    await faultStore.register({
      reporter_name: form.reporter_name,
      phone: form.phone,
      asset_id: form.asset_id,
      fault_type: form.fault_type,
      address_desc: form.address_desc,
      severity: form.severity,
      report_channel: form.report_channel || "HOTLINE"
    });
    ElMessage.success("故障报修已登记");
    dialogVisible.value = false;
  } catch (err) {
    ElMessage.error((err as ApiError).message ?? "登记失败");
  } finally {
    submitting.value = false;
  }
}

async function convertToTicket(faultId: number) {
  try {
    await ticketStore.createFromFault(faultId);
    ElMessage.success("已生成待派工工单，请到「抢修工单」派工");
    await faultStore.load();
  } catch (err) {
    ElMessage.error((err as ApiError).message ?? "生成工单失败");
    await faultStore.load();
  }
}

function ticketIdOfFault(faultId: number): number | null {
  return ticketStore.rows.find((t) => t.fault_report_id === faultId)?.id ?? null;
}

const canConvert = computed(() => auth.can(["DISPATCHER"]));
</script>

<template>
  <section v-loading="faultStore.loading">
    <header class="toolbar" style="justify-content: space-between">
      <div>
        <h1 class="page-title">故障报修</h1>
        <p class="page-sub">报修登记、故障分级与生成抢修工单</p>
      </div>
      <el-button type="primary" :disabled="!auth.can(['DISPATCHER', 'CREW_LEADER'])" @click="openCreate">
        登记报修
      </el-button>
    </header>

    <el-card class="page-section" shadow="never">
      <el-table :data="faultStore.rows" empty-text="">
        <template #empty><EmptyState text="暂无故障报修" /></template>
        <el-table-column prop="id" label="#" width="60" />
        <el-table-column prop="reporter_name" label="报修人" width="100" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column label="故障类型" width="110">
          <template #default="{ row }">
            {{ FaultTypeText[row.fault_type as keyof typeof FaultTypeText] ?? row.fault_type }}
          </template>
        </el-table-column>
        <el-table-column label="严重度" width="90">
          <template #default="{ row }"><PriorityTag :value="row.severity" /></template>
        </el-table-column>
        <el-table-column prop="address_desc" label="故障地址/描述" min-width="200" />
        <el-table-column prop="report_channel" label="渠道" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'CONVERTED' ? 'success' : 'warning'">
              {{ faultStatusText[row.status] ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="工单" width="110">
          <template #default="{ row }">
            <span v-if="ticketIdOfFault(row.id) !== null">
              #{{ ticketIdOfFault(row.id) }}
            </span>
            <el-button
              v-else
              link
              type="primary"
              :disabled="!canConvert"
              @click="convertToTicket(row.id)"
            >
              生成工单
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="登记故障报修" width="520px">
      <el-form label-position="top">
        <el-form-item label="报修人姓名" required>
          <el-input v-model="form.reporter_name" placeholder="如：王建国" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" placeholder="如：13800000000" />
        </el-form-item>
        <el-form-item label="故障类型">
          <el-select v-model="form.fault_type" style="width: 100%">
            <el-option v-for="t in FaultType" :key="t" :label="FaultTypeText[t]" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="故障严重度（决定派工技能要求）">
          <el-radio-group v-model="form.severity">
            <el-radio-button v-for="s in Severity" :key="s" :label="s">{{ SeverityText[s] }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="故障地址/描述" required>
          <el-input v-model="form.address_desc" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="报修渠道">
          <el-radio-group v-model="form.report_channel">
            <el-radio label="HOTLINE">热线</el-radio>
            <el-radio label="APP">APP</el-radio>
            <el-radio label="GRID_INSPECT">巡检</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">提交登记</el-button>
      </template>
    </el-dialog>
  </section>
</template>
