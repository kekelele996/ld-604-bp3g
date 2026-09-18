/**
 * 审计/操作日志模板集中存放，所有写操作都必须经模板落审计日志。
 * {token} 由 service 层在调用处填充；字段变更时必须同步改模板与调用处。
 */
export const LOG_TEMPLATES = {
  GridAsset: [
    "GridAsset.create 创建资产 {assetCode}",
    "GridAsset.update 更新资产 {assetCode} 字段 {fields}",
    "GridAsset.status 资产 {assetCode} 健康状态变更 {from}→{to}",
    "GridAsset.export 导出资产台账"
  ],
  FaultReport: [
    "FaultReport.create 登记故障报修 #{id} 严重度 {severity}",
    "FaultReport.update 更新故障报修 #{id} 字段 {fields}",
    "FaultReport.status 故障报修 #{id} 状态变更 {from}→{to}",
    "FaultReport.merge 故障报修 #{id} 合并至主单 #{masterId}",
    "FaultReport.convert 故障报修 #{id} 生成抢修工单 #{ticketId}"
  ],
  RepairTicket: [
    "RepairTicket.create 生成抢修工单 #{id}",
    "RepairTicket.dispatch 工单 #{id} 派工给班组 #{teamId} 严重度 {severity}",
    "RepairTicket.advance 工单 #{id} 状态推进 {from}→{to}",
    "RepairTicket.restore 工单 #{id} 复电确认",
    "RepairTicket.close 工单 #{id} 关闭",
    "RepairTicket.export 导出工单明细"
  ],
  Crew: [
    "Crew.create 新建班组 {name}",
    "Crew.update 更新班组 {name} 字段 {fields}",
    "Crew.status 班组 {name} 值班状态变更 {from}→{to}",
    "Crew.occupy 班组 #{id} 承接工单 #{ticketId}",
    "Crew.release 班组 #{id} 工单 #{ticketId} 完工释放",
    "Crew.export 导出班组台账"
  ],
  SparePartUsage: [
    "SparePartUsage.create 工单 #{ticketId} 申请备件 {partCode} x{quantity}",
    "SparePartUsage.approve 仓管 #{operatorId} 批准领用 #{id}",
    "SparePartUsage.reject 仓管 #{operatorId} 驳回领用 #{id} 库存回补 {quantity}",
    "SparePartUsage.consume 领用 #{id} 备件消耗出库",
    "SparePartUsage.export 导出领用记录"
  ],
  Inventory: [
    "Inventory.reserve 派工预留 {partCode} 扣减 {quantity} 余额 {balance}",
    "Inventory.return 驳回回补 {partCode} 增加 {quantity} 余额 {balance}",
    "Inventory.consume 消耗出库 {partCode} x{quantity}",
    "Inventory.adjust 手工调整 {partCode} {delta} 余额 {balance}"
  ]
} as const;

export type LogTemplateKey = keyof typeof LOG_TEMPLATES;
