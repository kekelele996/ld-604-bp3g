import type { Severity } from "../constants/Severity";

/** 兼容旧引用 */
export type RepairTicketPayload = Record<string, unknown>;

/** 故障报修转工单请求 */
export interface CreateTicketFromFaultPayload {
  fault_report_id: number;
}

/** 派工 + 备件领用（同一原子事务）请求体 */
export interface DispatchPartsPayload {
  parts: DispatchPartLine[];
}

/** 备件申请行（派工事务内部使用） */
export interface DispatchPartLine {
  part_code: string;
  quantity: number;
  warehouse_name?: string;
}

/** 状态推进请求体 */
export interface AdvanceStatusPayload {
  remark?: string;
}

export type TicketPriority = Severity;
