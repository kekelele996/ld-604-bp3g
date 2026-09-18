/** 备件领用记录状态 */
export const UsageStatus = ["PENDING", "APPROVED", "REJECTED", "CONSUMED", "RETURNED"] as const;
export type UsageStatus = (typeof UsageStatus)[number];

export const UsageStatusText: Record<UsageStatus, string> = {
  PENDING: "待审批",
  APPROVED: "已批准",
  REJECTED: "已驳回",
  CONSUMED: "已消耗",
  RETURNED: "已归还"
};

/** 库存流水类型 */
export const InventoryChangeType = ["RESERVE", "REJECT_RETURN", "CONSUME", "MANUAL_ADJUST"] as const;
export type InventoryChangeType = (typeof InventoryChangeType)[number];

export const InventoryChangeTypeText: Record<InventoryChangeType, string> = {
  RESERVE: "派工预留扣减",
  REJECT_RETURN: "驳回回补",
  CONSUME: "消耗出库",
  MANUAL_ADJUST: "手工调整"
};
