/**
 * 前端操作日志模板镜像（与后端 constants/logTemplates 对齐）：
 * 用于按钮操作后的本地提示/埋点占位；真实审计日志由后端事务写入 audit_log。
 * 字段变更时必须同步后端模板与调用处。
 */
export const LOG_TEMPLATES = {
  GridAsset: ["配网资产创建 {assetCode}", "配网资产更新 {assetCode} 字段 {fields}", "配网资产健康状态变更 {from}→{to}", "配网资产导出"],
  FaultReport: ["故障报修登记 #{id} 严重度 {severity}", "故障报修更新 #{id}", "故障报修状态变更 {from}→{to}", "故障报修转工单 #{ticketId}"],
  RepairTicket: [
    "抢修工单生成 #{id}",
    "工单 #{id} 派工给班组 #{teamId}（严重度 {severity}）",
    "工单 #{id} 状态推进 {from}→{to}",
    "工单 #{id} 复电确认",
    "工单 #{id} 关闭"
  ],
  Crew: ["班组 {name} 创建", "班组 {name} 更新", "班组 {name} 值班状态 {from}→{to}", "班组 #{id} 承接工单 #{ticketId}"],
  SparePartUsage: [
    "工单 #{ticketId} 申请备件 {partCode} x{quantity}",
    "仓管批准领用 #{id}",
    "仓管驳回领用 #{id}，库存回补 {quantity}",
    "领用 #{id} 备件消耗出库"
  ],
  Inventory: [
    "派工预留 {partCode} 扣减 {quantity} 余额 {balance}",
    "驳回回补 {partCode} 增加 {quantity} 余额 {balance}",
    "消耗出库 {partCode} x{quantity}",
    "手工调整 {partCode} {delta}"
  ]
} as const;
