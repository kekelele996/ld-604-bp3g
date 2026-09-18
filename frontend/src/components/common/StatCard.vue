<script setup lang="ts">
/** 指标卡（Dashboard 与各列表页头部共用） */
defineProps<{
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "danger" | "warning" | "success";
}>();
</script>

<template>
  <el-card shadow="hover" class="stat-card" :class="`tone-${tone ?? 'default'}`">
    <div class="stat-label">{{ label }}</div>
    <div class="stat-value">{{ value }}</div>
    <div v-if="hint" class="stat-hint">{{ hint }}</div>
  </el-card>
</template>

<style scoped>
.stat-card { border-radius: 10px; }
.stat-label { color: var(--el-text-color-secondary); font-size: 13px; }
.stat-value { font-size: 30px; font-weight: 700; color: var(--el-color-primary-dark-2); margin-top: 4px; }
.tone-danger .stat-value { color: var(--el-color-danger); }
.tone-warning .stat-value { color: var(--el-color-warning); }
.tone-success .stat-value { color: var(--el-color-success); }
.stat-hint { margin-top: 4px; font-size: 12px; color: var(--el-text-color-secondary); }
</style>
