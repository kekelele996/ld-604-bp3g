import { ERROR_CODES } from "./errorCodes";

export const ERROR_MESSAGES: Record<keyof typeof ERROR_CODES, string> = {
  AUTH_REQUIRED: "缺少登录凭证，请在 Authorization 头中携带 Bearer Token",
  AUTH_INVALID: "登录凭证无效或已过期",
  RBAC_DENIED: "当前角色无权执行该操作",
  VALIDATION_FAILED: "请求参数校验失败",
  RATE_LIMITED: "请求过于频繁，请稍后再试",

  RESOURCE_NOT_FOUND: "资源不存在",
  CREW_NOT_ON_DUTY: "该班组当前不处于值班状态，禁止派工",
  CREW_SKILL_MISMATCH: "班组技能标签不满足该故障类型的抢修要求",
  CREW_BUSY: "该班组已有在手工单，仅空闲班组可接单",
  DISPATCH_CONFLICT: "派工冲突：工单已被其他调度请求处理或班组刚被占用",

  TICKET_NOT_DISPATCHABLE: "仅待派工(WAIT_DISPATCH)状态的工单可以派工",
  TICKET_INVALID_TRANSITION: "工单状态只能按 待派工→已派工→到场→抢修中→复电→关闭 单向推进",
  TICKET_VERSION_CONFLICT: "工单已被其他人更新，请刷新后重试（乐观锁冲突）",

  PART_NOT_FOUND: "备件编码不存在",
  PART_STOCK_INSUFFICIENT: "备件库存不足，本次派工/领用已全部回滚，未写入任何占用或领用记录",
  PART_ALREADY_APPROVED: "该备件申请已审批，禁止重复审批",
  PART_NOT_PENDING: "仅待审批(PENDING)的备件申请可以审批",

  INTERNAL_ERROR: "服务器内部错误",
};
