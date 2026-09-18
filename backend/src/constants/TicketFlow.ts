import { TicketStatus } from "./TicketStatus";

/**
 * 工单状态机：只允许沿 待派工 -> 已派工 -> 到场 -> 抢修中 -> 复电 -> 关闭 推进。
 * 任何跳跃或回退都会被 service 拒绝（TICKET_INVALID_TRANSITION）。
 */
export const TICKET_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  WAIT_DISPATCH: ["ASSIGNED"],
  ASSIGNED: ["ARRIVED"],
  ARRIVED: ["REPAIRING"],
  REPAIRING: ["RESTORED"],
  RESTORED: ["CLOSED"],
  CLOSED: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TICKET_TRANSITIONS[from].includes(to);
}

export function nextStatus(from: TicketStatus): TicketStatus | null {
  return TICKET_TRANSITIONS[from][0] ?? null;
}
