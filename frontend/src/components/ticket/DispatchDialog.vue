<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { ElMessage } from "element-plus";
import type { RepairTicket } from "../../types/RepairTicket";
import type { Crew } from "../../types/Crew";
import type { SparePart } from "../../types/SparePartUsage";
import { useCrewAvailability } from "../../hooks/useCrewAvailability";
import CrewCard from "../common/CrewCard.vue";
import PriorityTag from "../common/PriorityTag.vue";
import type { Severity } from "../../constants/Severity";
import { SeverityText } from "../../constants/Severity";

const props = defineProps<{
  visible: boolean;
  ticket: RepairTicket | null;
  crews: Crew[];
  parts: SparePart[];
  acting?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "confirm", payload: { teamId: number; parts: Array<{ part_code: string; quantity: number }> }): void;
}>();

interface PartLine {
  part_code: string;
  quantity: number;
}

const form = reactive<{ teamId: number | null; lines: PartLine[] }>({
  teamId: null,
  lines: [{ part_code: "", quantity: 1 }]
});

const severity = computed<Severity | undefined>(() => (props.ticket?.priority as Severity) ?? undefined);

const { availableCrews, unavailableReason } = useCrewAvailability(
  computed(() => props.crews),
  severity
);

watch(
  () => props.visible,
  (open) => {
    if (open) {
      form.teamId = null;
      form.lines = [{ part_code: "", quantity: 1 }];
    }
  }
);

function addLine() {
  form.lines.push({ part_code: "", quantity: 1 });
}
function removeLine(index: number) {
  if (form.lines.length === 1) {
    ElMessage.warning("派工必须至少申请一项备件");
    return;
  }
  form.lines.splice(index, 1);
}

function stockOf(code: string): number {
  return props.parts.find((p) => p.part_code === code)?.stock_quantity ?? 0;
}

/** 任一备件库存不足时禁止提交（后端还会在事务内再次裁决，杜绝超卖） */
const hasInsufficient = computed(() =>
  form.lines.some((line) => {
    if (!line.part_code || line.quantity <= 0) return false;
    return stockOf(line.part_code) < line.quantity;
  })
);

const hasDuplicatePart = computed(() => {
  const codes = form.lines.map((l) => l.part_code).filter(Boolean);
  return new Set(codes).size !== codes.length;
});

const canConfirm = computed(
  () => form.teamId !== null && form.lines.length > 0 && form.lines.every((l) => l.part_code && l.quantity > 0) && !hasInsufficient.value && !hasDuplicatePart.value
);

function confirm() {
  if (!canConfirm.value || form.teamId === null) return;
  emit("confirm", {
    teamId: form.teamId,
    parts: form.lines.map((l) => ({ part_code: l.part_code, quantity: l.quantity }))
  });
}

function close() {
  emit("update:visible", false);
}

/** 同一种备件合并显示库存 */
const totalNeeded = computed(() => {
  const map = new Map<string, number>();
  for (const line of form.lines) {
    if (line.part_code) map.set(line.part_code, (map.get(line.part_code) ?? 0) + line.quantity);
  }
  return map;
});
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="派工并申请备件"
    width="760px"
    :close-on-click-modal="false"
    @update:model-value="close"
  >
    <div v-if="ticket" class="dispatch-head">
      <el-tag effect="plain" round>工单 #{{ ticket.id }}</el-tag>
      <span>故障报修 #{{ ticket.fault_report_id }}</span>
      <PriorityTag :value="ticket.priority ?? 'MINOR'" />
      <span class="severity-hint">
        严重度“{{ SeverityText[(ticket.priority as Severity) ?? 'MINOR'] }}”只允许技能匹配的值班空闲班组接单
      </span>
    </div>

    <el-divider content-position="left">选择承接班组</el-divider>
    <div class="crew-grid">
      <CrewCard
        v-for="crew in crews"
        :key="crew.id"
        :crew="crew"
        :severity="severity"
        :disabled-reason="availableCrews.some((c) => c.id === crew.id) ? '' : unavailableReason(crew, severity)"
        :selectable="availableCrews.some((c) => c.id === crew.id)"
        :selected="form.teamId === crew.id"
        @select="form.teamId = $event.id"
      />
    </div>

    <el-divider content-position="left">申请备件（库存不足时整次派工全部不写入）</el-divider>
    <div class="parts-lines">
      <div v-for="(line, index) in form.lines" :key="index" class="part-line">
        <el-select v-model="line.part_code" placeholder="选择备件" filterable style="flex: 2">
          <el-option
            v-for="part in parts"
            :key="part.part_code"
            :label="`${part.part_code} ${part.part_name}（库存 ${part.stock_quantity}）`"
            :value="part.part_code"
          />
        </el-select>
        <el-input-number v-model="line.quantity" :min="1" :max="9999" style="width: 140px" />
        <el-tag v-if="line.part_code" :type="stockOf(line.part_code) < line.quantity ? 'danger' : 'success'" effect="plain">
          库存 {{ stockOf(line.part_code) }}
        </el-tag>
        <el-button :icon="undefined" circle @click="removeLine(index)">－</el-button>
      </div>
    </div>
    <el-button text type="primary" @click="addLine">＋ 增加备件</el-button>

    <el-alert
      v-if="hasInsufficient"
      type="error"
      :closable="false"
      show-icon
      title="存在库存不足的备件：提交后后端会整体回滚（派工、班组占用、领用记录、库存流水均不写入）"
      style="margin-top: 10px"
    />
    <el-alert
      v-if="hasDuplicatePart"
      type="warning"
      :closable="false"
      show-icon
      title="同一备件不要分行填写，请合并数量"
      style="margin-top: 10px"
    />
    <div v-if="totalNeeded.size" class="needed-summary">
      本次合计预留：
      <el-tag v-for="(qty, code) in totalNeeded" :key="code" size="small" effect="plain" style="margin-right: 6px">
        {{ code }} × {{ qty }}
      </el-tag>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="acting" :disabled="!canConfirm" @click="confirm">
        确认派工
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dispatch-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.severity-hint { color: var(--el-text-color-secondary); font-size: 12px; }
.crew-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.parts-lines { display: grid; gap: 8px; margin-bottom: 8px; }
.part-line { display: flex; align-items: center; gap: 10px; }
.needed-summary { margin-top: 10px; font-size: 13px; color: var(--el-text-color-secondary); }
</style>
