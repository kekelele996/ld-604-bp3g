import type { RepairTicketRow } from "../database/types";

/** 抢修工单领域模型：状态受 TicketStatus 状态机约束 */
export type RepairTicket = RepairTicketRow;
