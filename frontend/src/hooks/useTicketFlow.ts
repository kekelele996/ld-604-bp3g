import { computed } from "vue";
import type { Ref } from "vue";
import type { RepairTicket } from "../types/RepairTicket";
import { TICKET_NEXT, type TicketStatus } from "../constants/TicketStatus";
import { TICKET_STATUS_TEXT } from "../constants/statusText";

/**
 * 工单流转：状态机只允许相邻推进，这里给出每个工单的“下一步”按钮文案与目标状态，
 * 与后端 TicketFlow 对齐。复电后可申请备件的窗口也在此判定。
 */
const NEXT_ACTION_LABEL: Partial<Record<TicketStatus, string>> = {
  ASSIGNED: "确认到场",
  ARRIVED: "开始抢修",
  REPAIRING: "确认复电",
  RESTORED: "关闭工单",
};

export function useTicketFlow(ticket: Ref<RepairTicket | undefined | null>) {
  const nextStatus = computed<TicketStatus | null>(() =>
    ticket.value ? TICKET_NEXT[ticket.value.status] : null,
  );
  const nextActionLabel = computed(() =>
    nextStatus.value ? NEXT_ACTION_LABEL[ticket.value!.status] ?? TICKET_STATUS_TEXT[nextStatus.value] : "",
  );
  const canDispatch = computed(() => ticket.value?.status === "WAIT_DISPATCH");
  const canApplyPart = computed(() =>
    ticket.value ? ["ARRIVED", "REPAIRING", "RESTORED"].includes(ticket.value.status) : false,
  );
  const isFinished = computed(() => ticket.value?.status === "CLOSED");

  return { nextStatus, nextActionLabel, canDispatch, canApplyPart, isFinished };
}

/** 工单状态在时间轴上的顺序（TimelineList 使用）。 */
export const TICKET_FLOW_STEPS: Array<{ status: TicketStatus; atField: keyof RepairTicket; label: string }> = [
  { status: "ASSIGNED", atField: "assignedAt", label: "已派工" },
  { status: "ARRIVED", atField: "arrivedAt", label: "到场" },
  { status: "REPAIRING", atField: "repairStartedAt", label: "抢修中" },
  { status: "RESTORED", atField: "restoredAt", label: "复电" },
  { status: "CLOSED", atField: "closedAt", label: "关闭" },
];
