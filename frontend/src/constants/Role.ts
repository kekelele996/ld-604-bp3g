export const UserRole = ["DISPATCHER", "LEADER", "WAREHOUSE", "AUDITOR", "ADMIN"] as const;
export type UserRole = (typeof UserRole)[number];

export const ROLE_LABEL: Record<string, string> = {
  DISPATCHER: "调度员",
  LEADER: "班组长",
  WAREHOUSE: "仓管",
  AUDITOR: "审计员",
  ADMIN: "管理员",
};

/** 角色 -> 可执行的写操作（按钮显隐与后端 rbacMiddleware 双端对齐）。 */
export const ROLE_CAN: Record<string, Record<string, boolean>> = {
  DISPATCHER: { dispatch: true, createFault: true, createTicket: true, merge: true, advance: true, setDuty: true },
  LEADER: { advance: true, applyPart: true, returnPart: true, setDuty: true },
  WAREHOUSE: { approvePart: true, rejectPart: true, returnPart: true, createPart: true },
  AUDITOR: {},
  ADMIN: {
    dispatch: true, createFault: true, createTicket: true, merge: true, advance: true,
    applyPart: true, approvePart: true, rejectPart: true, returnPart: true, setDuty: true, createPart: true,
  },
};

export function can(role: string | undefined, action: string): boolean {
  if (!role) return false;
  return Boolean(ROLE_CAN[role]?.[action]);
}
