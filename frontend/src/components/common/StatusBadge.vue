<script setup lang="ts">
import { computed } from "vue";
import { ticketStatusLevel } from "../../utils/formatters";

const props = defineProps<{ value: string; text?: string; kind?: "ticket" | "plain" }>();

const cls = computed(() => `badge badge-${props.kind === "plain" ? "info" : ticketStatusLevel(props.value)}`);
</script>

<template>
  <span :class="cls">{{ text ?? value }}</span>
</template>
