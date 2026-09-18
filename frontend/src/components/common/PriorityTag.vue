<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ priority?: string; severity?: string }>();

const map: Record<string, { cls: string; text: string }> = {
  P1: { cls: "p1", text: "P1 特急" },
  P2: { cls: "p2", text: "P2 紧急" },
  P3: { cls: "p3", text: "P3 一般" },
  P4: { cls: "p4", text: "P4 低" },
};

const view = computed(() => {
  if (props.priority) return map[props.priority] ?? { cls: "p3", text: props.priority };
  const sevMap: Record<string, { cls: string; text: string }> = {
    CRITICAL: map.P1, HIGH: map.P2, MEDIUM: map.P3, LOW: map.P4,
  };
  return sevMap[props.severity ?? ""] ?? { cls: "p3", text: props.severity ?? "—" };
});
</script>

<template>
  <span class="priority" :class="view.cls">{{ view.text }}</span>
</template>
