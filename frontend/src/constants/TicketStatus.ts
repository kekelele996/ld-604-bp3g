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

/** 状态机：仅允许相邻推进；派工单独走 dispatch 接口 */
export const TICKET_STATUS_FLOW: Record<TicketStatus, TicketStatus | null> = {
  WAIT_DISPATCH: "ASSIGNED",
  ASSIGNED: "ARRIVED",
  ARRIVED: "REPAIRING",
  REPAIRING: "RESTORED",
  RESTORED: "CLOSED",
  CLOSED: null
};

/** 各状态在前端可执行的下一步动作文案（按钮显隐共用） */
export const TicketNextActionText: Partial<Record<TicketStatus, string>> = {
  ASSIGNED: "到场",
  ARRIVED: "开始抢修",
  REPAIRING: "复电确认",
  RESTORED: "关闭工单"
};
