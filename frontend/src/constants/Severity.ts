export const Severity = ["CRITICAL", "MAJOR", "MINOR"] as const;
export type Severity = (typeof Severity)[number];

export const SeverityText: Record<Severity, string> = {
  CRITICAL: "危急",
  MAJOR: "重大",
  MINOR: "一般"
};

/** Element Plus tag 类型（PriorityTag 展示共用） */
export const SeverityTagType: Record<Severity, "danger" | "warning" | "info"> = {
  CRITICAL: "danger",
  MAJOR: "warning",
  MINOR: "info"
};

/** 严重度 → 班组必备技能标签 */
export const SEVERITY_SKILL_RULE: Record<Severity, string[]> = {
  CRITICAL: ["HOT_LINE"],
  MAJOR: ["CABLE", "HOT_LINE"],
  MINOR: []
};

export const SkillTagText: Record<string, string> = {
  HOT_LINE: "带电作业",
  CABLE: "电缆检修",
  OVERHEAD: "架空线路",
  TRANSFORMER: "变压器检修"
};

export const SEVERITY_RANK: Record<Severity, number> = { CRITICAL: 0, MAJOR: 1, MINOR: 2 };
