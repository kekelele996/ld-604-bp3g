<script setup lang="ts">
import { computed } from "vue";
import EmptyState from "./EmptyState.vue";

export interface TimelineItem {
  id?: number;
  from_status?: string | null;
  to_status: string;
  remark?: string | null;
  created_at?: string;
  operator_id?: number | null;
}

/** 工单时间线（工单页与故障详情共用） */
const props = defineProps<{
  items: TimelineItem[];
  statusTextMap?: Record<string, string>;
}>();

const formatTime = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("zh-CN", { hour12: false });
};

const nodes = computed(() =>
  [...props.items]
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    .map((item) => ({
      ...item,
      title: props.statusTextMap?.[item.to_status] ?? item.to_status.replace(/_/g, " "),
      fromText: item.from_status ? props.statusTextMap?.[item.from_status] ?? item.from_status.replace(/_/g, " ") : null
    }))
);
</script>

<template>
  <EmptyState v-if="nodes.length === 0" text="暂无流转记录" />
  <el-timeline v-else>
    <el-timeline-item
      v-for="node in nodes"
      :key="node.id ?? `${node.to_status}-${node.created_at}`"
      :timestamp="formatTime(node.created_at)"
      placement="top"
      type="primary"
    >
      <div class="tl-title">
        <span v-if="node.fromText" class="from">{{ node.fromText }}</span>
        <el-icon v-if="node.fromText"><ArrowRight /></el-icon>
        <strong>{{ node.title }}</strong>
      </div>
      <div v-if="node.remark" class="tl-remark">{{ node.remark }}</div>
      <div v-if="node.operator_id !== null && node.operator_id !== undefined" class="tl-operator">
        操作人 #{{ node.operator_id }}
      </div>
    </el-timeline-item>
  </el-timeline>
</template>

<style scoped>
.tl-title { display: flex; align-items: center; gap: 6px; }
.tl-title .from { color: var(--el-text-color-secondary); }
.tl-remark { color: var(--el-text-color-regular); font-size: 13px; margin-top: 2px; }
.tl-operator { color: var(--el-text-color-secondary); font-size: 12px; }
</style>
