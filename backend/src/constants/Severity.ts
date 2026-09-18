/** 故障严重度（报修分级） */
export const Severity = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type Severity = (typeof Severity)[number];

export const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/** 派工优先级：严重度越高优先级数字越小 */
export const SEVERITY_PRIORITY: Record<Severity, "P1" | "P2" | "P3" | "P4"> = {
  CRITICAL: "P1",
  HIGH: "P2",
  MEDIUM: "P3",
  LOW: "P4",
};
