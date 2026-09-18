import type { RepairTicket } from "../types/RepairTicket";

/** 工单详情默认对象（新建前/加载占位），禁止页面散写结构。 */
export const createDefaultRepairTicket = (overrides: Partial<RepairTicket> = {}): RepairTicket => ({
  id: 0,
  faultReportId: 0,
  teamId: null,
  dispatcherId: null,
  priority: "P3",
  status: "WAIT_DISPATCH",
  statusText: "待派工",
  faultType: "",
  severity: "MEDIUM",
  reporterName: "",
  teamName: null,
  dispatcherName: null,
  assignedAt: null,
  arrivedAt: null,
  repairStartedAt: null,
  restoredAt: null,
  closedAt: null,
  restoreMinutes: null,
  version: 0,
  ...overrides,
});

/** 派工表单默认值。 */
export const createDispatchForm = (ticketId = 0) => ({
  ticketId,
  teamId: null as number | null,
  parts: [] as Array<{ partCode: string; quantity: number }>,
  withParts: false,
});

export const createRepairTicketForm = createDefaultRepairTicket;
export const createRepairTicketResponse = createDefaultRepairTicket;
