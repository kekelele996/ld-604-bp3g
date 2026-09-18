export const Role = ["DISPATCHER", "CREW_LEADER", "WAREHOUSE", "AUDITOR", "ADMIN"] as const;
export type Role = (typeof Role)[number];
export type RoleCode = Role;

export const RoleText: Record<Role, string> = {
  DISPATCHER: "调度员",
  CREW_LEADER: "班组长",
  WAREHOUSE: "仓管",
  AUDITOR: "审计员",
  ADMIN: "管理员"
};
