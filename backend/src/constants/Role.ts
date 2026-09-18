/** RBAC 角色：调度员 / 班组长 / 仓管 / 审计员 / 管理员 */
export const Role = ["DISPATCHER", "CREW_LEADER", "WAREHOUSE", "AUDITOR", "ADMIN"] as const;
export type Role = (typeof Role)[number];

export const RoleText: Record<Role, string> = {
  DISPATCHER: "调度员",
  CREW_LEADER: "班组长",
  WAREHOUSE: "仓管",
  AUDITOR: "审计员",
  ADMIN: "管理员"
};

/** 登录态主体（JWT payload 解密后挂到 req.user） */
export interface AuthUser {
  id: number;
  name: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
