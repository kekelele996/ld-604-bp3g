import { computed, type Ref } from "vue";
import type { RepairTicket } from "../types/RepairTicket";
import { TICKET_STATUS_FLOW, TicketNextActionText, type TicketStatus } from "../constants/TicketStatus";

/**
 * 工单流转 hook：
 * - nextActionOf 返回工单当前状态允许的唯一下一步（与后端状态机一致）；
 * - canAdvance 仅做按钮显隐，最终裁决以后端事务结果为准。
 */
export function useTicketFlow(ticket: Ref<RepairTicket | null | undefined> | RepairTicket | null | undefined) {
  const status = computed<TicketStatus | undefined>(() =>
    "value" in (ticket as object) ? (ticket as Ref<RepairTicket | null | undefined>).value?.status : (ticket as RepairTicket | null | undefined)?.status
  );

  const nextStatus = computed<TicketStatus | null>(() => (status.value ? TICKET_STATUS_FLOW[status.value] : null));

  const nextActionText = computed<string>(() => {
    if (!status.value) return "";
    return TicketNextActionText[status.value] ?? "";
  });

  /** 派工入口只在待派工时出现；到场/抢修/复电为班组长动作；关闭为调度员动作 */
  const canDispatch = computed(() => status.value === "WAIT_DISPATCH");

  return { status, nextStatus, nextActionText, canDispatch };
}
