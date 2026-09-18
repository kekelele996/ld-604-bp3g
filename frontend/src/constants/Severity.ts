export const Severity = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export type Severity = (typeof Severity)[number];

/** 严重度 -> 派工优先级，与后端 SEVERITY_PRIORITY 保持一致。 */
export const SEVERITY_PRIORITY: Record<Severity, "P1" | "P2" | "P3" | "P4"> = {
  CRITICAL: "P1",
  HIGH: "P2",
  MEDIUM: "P3",
  LOW: "P4",
};
