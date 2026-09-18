/**
 * 审计日志模板集中地：所有写操作必须按模板落 audit_log。
 * 模板为 { action, message } 形式，message 支持 {占位符}，由 renderLogTemplate 填充。
 */
export interface LogTemplate {
  action: string;
  message: string;
}

export const LOG_TEMPLATES: Record<string, Record<string, LogTemplate>> = {
  GridAsset: {
    create: { action: "GridAsset.create", message: "新增配网资产 {asset_code}（{asset_type}，线路 {feeder_line}）" },
    update: { action: "GridAsset.update", message: "更新配网资产 {asset_code}，变更字段：{changed_fields}" },
    status: { action: "GridAsset.status", message: "资产 {asset_code} 健康状态由 {from_status} 变更为 {to_status}" },
    export: { action: "GridAsset.export", message: "导出配网资产台账，共 {row_count} 条" },
  },
  FaultReport: {
    create: { action: "FaultReport.create", message: "登记故障报修 #{fault_id}：{fault_type}/{severity}，来电 {phone}" },
    update: { action: "FaultReport.update", message: "更新故障报修 #{fault_id}，变更字段：{changed_fields}" },
    merge: { action: "FaultReport.merge", message: "重复报修 #{fault_id} 合并至主报修 #{merged_into_id}" },
    createTicket: { action: "FaultReport.createTicket", message: "报修 #{fault_id} 生成抢修工单 #{ticket_id}" },
  },
  RepairTicket: {
    create: { action: "RepairTicket.create", message: "创建抢修工单 #{ticket_id}（来源报修 #{fault_id}，优先级 {priority}）" },
    dispatch: { action: "RepairTicket.dispatch", message: "工单 #{ticket_id} 派工至班组 {team_name}（{skill_tags}），优先级 {priority}" },
    transition: { action: "RepairTicket.transition", message: "工单 #{ticket_id} 状态 {from_status} → {to_status}，操作人 {actor}" },
    restore: { action: "RepairTicket.restore", message: "工单 #{ticket_id} 已复电，耗时 {duration_minutes} 分钟" },
    close: { action: "RepairTicket.close", message: "工单 #{ticket_id} 关闭归档" },
  },
  Crew: {
    create: { action: "Crew.create", message: "新建抢修班组 {team_name}，技能标签 {skill_tags}" },
    update: { action: "Crew.update", message: "更新班组 {team_name}，变更字段：{changed_fields}" },
    duty: { action: "Crew.duty", message: "班组 {team_name} 值班状态变更为 {duty_status}" },
    occupy: { action: "Crew.occupy", message: "班组 {team_name} 接手工单 #{ticket_id}，进入占用状态" },
    release: { action: "Crew.release", message: "班组 {team_name} 工单 #{ticket_id} 结束，恢复空闲" },
  },
  SparePartUsage: {
    apply: { action: "SparePartUsage.apply", message: "工单 #{ticket_id} 申请备件 {part_code} x{quantity}（{warehouse_name}）" },
    approve: { action: "SparePartUsage.approve", message: "备件申请 #{usage_id}（{part_code} x{quantity}）审批通过并出库，结存 {balance_after}" },
    reject: { action: "SparePartUsage.reject", message: "备件申请 #{usage_id}（{part_code} x{quantity}）审批驳回：{reason}" },
    consume: { action: "SparePartUsage.consume", message: "备件 {part_code} x{quantity} 已在工单 #{ticket_id} 消耗" },
    return: { action: "SparePartUsage.return", message: "备件 {part_code} x{quantity} 随工单 #{ticket_id} 归还入库，结存 {balance_after}" },
    insufficient: { action: "SparePartUsage.insufficient", message: "备件 {part_code} 库存不足（申请 {quantity}，结存 {stock}），事务回滚" },
  },
  InventoryTransaction: {
    outbound: { action: "InventoryTransaction.outbound", message: "库存出库 {part_code} {change_qty}，结存 {balance_after}，关联申请 #{usage_id}" },
    inbound: { action: "InventoryTransaction.inbound", message: "库存入库 {part_code} +{change_qty}，结存 {balance_after}" },
  },
  Auth: {
    login: { action: "Auth.login", message: "用户 {username}（{role}）登录系统" },
    denied: { action: "Auth.denied", message: "角色 {role} 访问 {path} 被拒绝" },
  },
};

export function renderLogTemplate(template: LogTemplate, vars: Record<string, string | number | undefined>): { action: string; message: string } {
  const message = template.message.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] === undefined || vars[key] === null ? "" : String(vars[key]),
  );
  return { action: template.action, message };
}
