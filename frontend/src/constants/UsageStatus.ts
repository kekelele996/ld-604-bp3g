export const UsageStatus = ["PENDING", "APPROVED", "REJECTED", "CONSUMED", "RETURNED"] as const;
export type UsageStatus = (typeof UsageStatus)[number];

export const UsageStatusText: Record<UsageStatus, string> = {
  PENDING: "待审批",
  APPROVED: "已批准",
  REJECTED: "已驳回",
  CONSUMED: "已消耗",
  RETURNED: "已归还"
};

export const UsageStatusTagType: Record<UsageStatus, "warning" | "success" | "danger" | "info"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CONSUMED: "info",
  RETURNED: "info"
};

export const InventoryChangeTypeText: Record<string, string> = {
  RESERVE: "派工预留扣减",
  REJECT_RETURN: "驳回回补",
  CONSUME: "消耗出库",
  MANUAL_ADJUST: "手工调整"
};
