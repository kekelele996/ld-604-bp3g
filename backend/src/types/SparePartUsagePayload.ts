/** 兼容旧引用 */
export type SparePartUsagePayload = Record<string, unknown>;

/** 仓管审批请求体 */
export interface ApproveUsagePayload {
  decision: "APPROVED" | "REJECTED";
  remark?: string;
}

/** 派工时提交的领用行 */
export interface CreateUsagePayload {
  ticket_id: number;
  part_code: string;
  quantity: number;
  warehouse_name?: string;
}
