export const TicketStatus = ["WAIT_DISPATCH", "ASSIGNED", "ARRIVED", "REPAIRING", "RESTORED", "CLOSED"] as const;
export type TicketStatus = (typeof TicketStatus)[number];

export const TicketStatusText: Record<TicketStatus, string> = {
  WAIT_DISPATCH: "待派工",
  ASSIGNED: "已派工",
  ARRIVED: "到场",
  REPAIRING: "抢修中",
  RESTORED: "复电",
  CLOSED: "关闭"
};

/**
 * 工单状态机：唯一允许的推进路径
 * WAIT_DISPATCH → ASSIGNED → ARRIVED → REPAIRING → RESTORED → CLOSED。
 * 派工（WAIT_DISPATCH→ASSIGNED）在 DispatchService 内单独实现，
 * 其余推进统一走 advanceStatus；任何跳跃/回退一律拒绝。
 */
export const TICKET_STATUS_FLOW: Record<TicketStatus, TicketStatus | null> = {
  WAIT_DISPATCH: "ASSIGNED",
  ASSIGNED: "ARRIVED",
  ARRIVED: "REPAIRING",
  REPAIRING: "RESTORED",
  RESTORED: "CLOSED",
  CLOSED: null
};
