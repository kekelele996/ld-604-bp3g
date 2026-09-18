export const UserRole = ["DISPATCHER", "LEADER", "WAREHOUSE", "AUDITOR", "ADMIN"] as const;
export type UserRole = (typeof UserRole)[number];

export const ROLE_LABEL: Record<string, string> = {
  DISPATCHER: "调度员",
  LEADER: "班组长",
  WAREHOUSE: "仓管",
  AUDITOR: "审计员",
  ADMIN: "管理员",
};
