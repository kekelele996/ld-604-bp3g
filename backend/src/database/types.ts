/**
 * 持久化行类型（snake_case，与 MySQL 表结构一一对应）。
 */

export interface GridAssetRow {
  id: number;
  asset_code: string;
  asset_type: string;
  feeder_line: string;
  voltage_level: string;
  location_desc: string;
  health_status: string;
  owner_team_id: number | null;
}

export interface FaultReportRow {
  id: number;
  reporter_name: string;
  phone: string;
  asset_id: number | null;
  fault_type: string;
  address_desc: string;
  /** CRITICAL / MAJOR / MINOR */
  severity: string;
  report_channel: string;
  /** RECEIVED / MERGED / CONVERTED */
  status: string;
}

export interface RepairTicketRow {
  id: number;
  fault_report_id: number;
  team_id: number | null;
  dispatcher_id: number | null;
  priority: string | null;
  /** WAIT_DISPATCH / ASSIGNED / ARRIVED / REPAIRING / RESTORED / CLOSED */
  status: string;
  assigned_at: Date | string | null;
  arrived_at: Date | string | null;
  repairing_at: Date | string | null;
  restored_at: Date | string | null;
  closed_at: Date | string | null;
}

export interface CrewRow {
  id: number;
  name: string;
  leader_id: number;
  skill_tags: string;
  /** ON_DUTY / OFF_DUTY */
  duty_status: string;
  current_ticket_id: number | null;
  contact_phone: string;
}

export interface SparePartRow {
  id: number;
  part_code: string;
  part_name: string;
  warehouse_name: string;
  stock_quantity: number;
}

export interface SparePartUsageRow {
  id: number;
  ticket_id: number;
  part_code: string;
  part_name: string;
  quantity: number;
  warehouse_name: string;
  /** PENDING / APPROVED / REJECTED / CONSUMED / RETURNED */
  usage_status: string;
  approved_by: number | null;
  approved_at: Date | string | null;
  created_at: Date | string;
}

export interface InventoryTransactionRow {
  id: number;
  part_code: string;
  /** RESERVE / REJECT_RETURN / CONSUME / MANUAL_ADJUST */
  change_type: string;
  quantity: number;
  balance_after: number;
  ticket_id: number | null;
  usage_id: number | null;
  operator_id: number | null;
  remark: string | null;
  created_at: Date | string;
}

export interface TicketEventLogRow {
  id: number;
  ticket_id: number;
  from_status: string | null;
  to_status: string;
  operator_id: number | null;
  remark: string | null;
  created_at: Date | string;
}

export interface AuditLogRow {
  id: number;
  actor: string;
  action: string;
  target_type: string;
  target_id: string | null;
  detail: string | null;
  created_at: Date | string;
}
