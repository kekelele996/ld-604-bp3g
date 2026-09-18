import type { RepairTicket } from "../types/RepairTicket";

/** 默认工单：新生成的待派工工单 */
export const createDefaultRepairTicket = (overrides: Partial<RepairTicket> = {}): RepairTicket => ({
  id: 0,
  fault_report_id: 0,
  team_id: null,
  dispatcher_id: null,
  priority: null,
  status: "WAIT_DISPATCH",
  assigned_at: null,
  arrived_at: null,
  repairing_at: null,
  restored_at: null,
  closed_at: null,
  ...overrides
});

/** 派工表单对象（页面/store 不散写默认结构） */
export const createRepairTicketForm = (faultReportId: number, overrides: Partial<RepairTicket> = {}): RepairTicket =>
  createDefaultRepairTicket({ fault_report_id: faultReportId, ...overrides });

/** 响应对象归一化（容错后端字段缺失） */
export const createRepairTicketResponse = (row: Partial<RepairTicket>): RepairTicket =>
  createDefaultRepairTicket(row);
