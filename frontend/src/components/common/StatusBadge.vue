<script setup lang="ts">
import { computed } from "vue";
import { STATUS_TEXT } from "../../constants/statusText";
import { TicketStatus } from "../../constants/TicketStatus";
import { UsageStatus, UsageStatusTagType } from "../../constants/UsageStatus";
import { AssetHealthStatus, AssetHealthStatusTagType } from "../../constants/AssetHealthStatus";
import { DutyStatus } from "../../constants/DutyStatus";

/**
 * 通用状态徽标：工单状态/领用状态/值班状态/资产健康度共用。
 * 工单与领用页、资产页、Dashboard 均消费该组件（≥2 页面共用）。
 */
const props = defineProps<{ value: string; kind?: "ticket" | "usage" | "duty" | "health" }>();

const ticketTagType: Record<string, "info" | "primary" | "warning" | "" | "success" | "danger"> = {
  WAIT_DISPATCH: "danger",
  ASSIGNED: "primary",
  ARRIVED: "warning",
  REPAIRING: "warning",
  RESTORED: "success",
  CLOSED: "info"
};

const kind = computed(() => props.kind ?? inferKind(props.value));

function inferKind(value: string): "ticket" | "usage" | "duty" | "health" | "ticket" {
  if ((TicketStatus as readonly string[]).includes(value)) return "ticket";
  if ((UsageStatus as readonly string[]).includes(value)) return "usage";
  if ((DutyStatus as readonly string[]).includes(value)) return "duty";
  if ((AssetHealthStatus as readonly string[]).includes(value)) return "health";
  return "ticket";
}

const text = computed(() => {
  switch (kind.value) {
    case "ticket":
      return STATUS_TEXT.TicketStatus[props.value as keyof typeof STATUS_TEXT.TicketStatus] ?? props.value;
    case "usage":
      return STATUS_TEXT.UsageStatus[props.value as keyof typeof STATUS_TEXT.UsageStatus] ?? props.value;
    case "duty":
      return STATUS_TEXT.DutyStatus[props.value as keyof typeof STATUS_TEXT.DutyStatus] ?? props.value;
    case "health":
      return STATUS_TEXT.AssetHealthStatus[props.value as keyof typeof STATUS_TEXT.AssetHealthStatus] ?? props.value;
  }
});

const tagType = computed(() => {
  switch (kind.value) {
    case "ticket":
      return ticketTagType[props.value] ?? "info";
    case "usage":
      return UsageStatusTagType[props.value as keyof typeof UsageStatusTagType] ?? "info";
    case "duty":
      return props.value === "ON_DUTY" ? "success" : "info";
    case "health":
      return AssetHealthStatusTagType[props.value as keyof typeof AssetHealthStatusTagType] ?? "info";
  }
});
</script>

<template>
  <el-tag :type="tagType" effect="light" round disable-transitions>{{ text }}</el-tag>
</template>
