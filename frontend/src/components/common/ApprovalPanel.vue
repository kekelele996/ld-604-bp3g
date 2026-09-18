<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "../../stores/authStore";
import { can } from "../../constants/Role";

const props = defineProps<{
  usageId: number;
  status: string;
}>();
const emit = defineEmits<{
  (e: "approve", id: number): void;
  (e: "reject", id: number, reason: string): void;
}>();

const authStore = useAuthStore();
const rejecting = ref(false);
const reason = ref("");

function submitReject() {
  emit("reject", props.usageId, reason.value || "仓管驳回");
  rejecting.value = false;
  reason.value = "";
}
</script>

<template>
  <div class="approval-panel">
    <template v-if="status === 'PENDING'">
      <template v-if="can(authStore.role, 'approvePart')">
        <button class="btn btn-success btn-sm" @click="emit('approve', usageId)">审批通过</button>
        <button class="btn btn-ghost btn-sm" @click="rejecting = !rejecting">驳回</button>
        <div v-if="rejecting" class="reject-box">
          <input v-model="reason" placeholder="驳回原因" class="input input-sm" />
          <button class="btn btn-danger btn-sm" @click="submitReject">确认驳回</button>
        </div>
      </template>
      <span v-else class="hint">待仓管审批</span>
    </template>
  </div>
</template>
