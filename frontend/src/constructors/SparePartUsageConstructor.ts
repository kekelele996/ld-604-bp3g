import type { SparePartUsage } from "../types/SparePartUsage";

/** 备件申请表单默认对象。 */
export const createSparePartUsageForm = (ticketId = 0) => ({
  ticketId,
  partCode: "",
  quantity: 1,
});

export const createDefaultSparePartUsage = (overrides: Partial<SparePartUsage> = {}): SparePartUsage => ({
  id: 0,
  ticketId: 0,
  ticketStatus: "ARRIVED",
  partCode: "",
  partName: "",
  quantity: 1,
  warehouseName: "中心仓库",
  usageStatus: "PENDING",
  usageStatusText: "待审批",
  requestedBy: null,
  approvedBy: null,
  rejectedBy: null,
  approvedAt: null,
  currentStock: 0,
  version: 0,
  ...overrides,
});

export const createSparePartUsageResponse = createDefaultSparePartUsage;
