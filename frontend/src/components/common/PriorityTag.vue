<script setup lang="ts">
import { computed } from "vue";
import { Severity, SeverityText, SeverityTagType, type Severity as SeverityLevel } from "../../constants/Severity";

/** 故障严重度/工单优先级标签（故障页、工单页、Dashboard 共用） */
const props = defineProps<{ value: string }>();

const level = computed<SeverityLevel>(() =>
  (Severity as readonly string[]).includes(props.value) ? (props.value as SeverityLevel) : "MINOR"
);
</script>

<template>
  <el-tag :type="SeverityTagType[level]" effect="dark" disable-transitions>
    {{ SeverityText[level] }}
  </el-tag>
</template>
