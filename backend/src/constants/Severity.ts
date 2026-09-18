/**
 * 故障严重度（FaultReport.severity / RepairTicket.priority 共用取值）。
 * 调度员按严重度派工，班组技能必须覆盖该严重度才能接单。
 */
export const Severity = ["CRITICAL", "MAJOR", "MINOR"] as const;
export type Severity = (typeof Severity)[number];

export const SeverityText: Record<Severity, string> = {
  CRITICAL: "危急",
  MAJOR: "重大",
  MINOR: "一般"
};

/**
 * 严重度 → 班组必备技能标签。
 * - CRITICAL 带电作业高危故障，必须持有 HOT_LINE 技能；
 * - MAJOR 电缆/设备类故障，必须持有 CABLE 技能（HOT_LINE 班组默认也可处理）；
 * - MINOR 普通故障，值班班组均可处理。
 */
export const SEVERITY_SKILL_RULE: Record<Severity, string[]> = {
  CRITICAL: ["HOT_LINE"],
  MAJOR: ["CABLE", "HOT_LINE"],
  MINOR: []
};

/** 技能标签中文说明（展示组件、筛选器共用） */
export const SkillTagText: Record<string, string> = {
  HOT_LINE: "带电作业",
  CABLE: "电缆检修",
  OVERHEAD: "架空线路",
  TRANSFORMER: "变压器检修"
};

/** 派工时的严重度排序，危急优先 */
export const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 0,
  MAJOR: 1,
  MINOR: 2
};
