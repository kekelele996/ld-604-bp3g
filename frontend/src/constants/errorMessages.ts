/** 前端错误文案兜底（后端消息优先；本地离线/mock 场景使用本映射） */
export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  AUTH_INVALID: "登录凭证无效或已过期",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",

  TICKET_NOT_FOUND: "抢修工单不存在",
  TICKET_STATUS_CONFLICT: "工单状态已被其他操作变更，请刷新后重试",
  TICKET_ALREADY_DISPATCHED: "该工单已派工，请勿重复派工",
  TICKET_STATUS_FLOW_VIOLATION: "工单状态只能按 待派工→已派工→到场→抢修中→复电→关闭 顺序推进",

  CREW_NOT_FOUND: "抢修班组不存在",
  CREW_OFF_DUTY: "班组当前不在值班状态，无法接单",
  CREW_BUSY: "班组正在执行其他工单，无法接单",
  CREW_SKILL_MISMATCH: "班组技能不满足故障严重度的派工要求",

  PART_NOT_FOUND: "备件不存在",
  PART_STOCK_INSUFFICIENT: "备件库存不足，本次派工已整体取消",
  USAGE_NOT_FOUND: "备件领用记录不存在",
  USAGE_ALREADY_APPROVED: "该备件领用已审批，重复审批无效",
  USAGE_NOT_PENDING: "仅待审批的领用记录可以审批",

  FAULT_REPORT_NOT_FOUND: "故障报修单不存在",
  FAULT_ALREADY_CONVERTED: "该故障报修单已生成工单"
} as const;
