export const TicketStatus = [
  "WAIT_DISPATCH",
  "ASSIGNED",
  "ARRIVED",
  "REPAIRING",
  "RESTORED",
  "CLOSED",
] as const;
export type TicketStatus = (typeof TicketStatus)[number];

/** 工单状态机：只允许相邻状态前进。 */
export const TICKET_NEXT: Record<TicketStatus, TicketStatus | null> = {
  WAIT_DISPATCH: "ASSIGNED",
  ASSIGNED: "ARRIVED",
  ARRIVED: "REPAIRING",
  REPAIRING: "RESTORED",
  RESTORED: "CLOSED",
  CLOSED: null,
};
