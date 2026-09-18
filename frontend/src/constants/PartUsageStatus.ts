export const PartUsageStatus = ["PENDING", "APPROVED", "REJECTED", "CONSUMED", "RETURNED"] as const;
export type PartUsageStatus = (typeof PartUsageStatus)[number];
