/**
 * 本地种子数据说明（业务数据全部来自后端数据库 database/init.sql，前端不内联业务数据）。
 * 登录页快捷账号与 database/init.sql 的 sys_user 表一一对应：
 *
 *  dispatcher  调度员张敏  DISPATCHER  派工、生成工单、合并重复、状态推进
 *  leader1     班长李刚    LEADER      到场/抢修/复电推进、申请备件、归还
 *  keeper      仓管王芳    WAREHOUSE   备件审批/驳回、库存目录
 *  auditor     审计员赵磊  AUDITOR     只读 + 库存流水核对
 *  leader2     班长陈强    LEADER      第二个班组长账号
 */
export const SEED_ACCOUNTS = [
  { username: "dispatcher", displayName: "调度员张敏", role: "DISPATCHER" },
  { username: "leader1", displayName: "班长李刚", role: "LEADER" },
  { username: "keeper", displayName: "仓管王芳", role: "WAREHOUSE" },
  { username: "auditor", displayName: "审计员赵磊", role: "AUDITOR" },
  { username: "leader2", displayName: "班长陈强", role: "LEADER" },
] as const;
