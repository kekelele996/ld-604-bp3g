import type { RepairTicketRow } from "../database/types";

/** 工单响应 DTO（Date 统一转 ISO 字符串，前端直接渲染时间线） */
export interface RepairTicketDto {
  id: number;
  fault_report_id: number;
  team_id: number | null;
  dispatcher_id: number | null;
  priority: string | null;
  status: string;
  assigned_at: string | null;
  arrived_at: string | null;
  repairing_at: string | null;
  restored_at: string | null;
  closed_at: string | null;
}

const toIso = (value: Date | string | null): string | null => (value instanceof Date ? value.toISOString() : value);

export function createRepairTicketDto(row: RepairTicketRow): RepairTicketDto {
  return {
    id: row.id,
    fault_report_id: row.fault_report_id,
    team_id: row.team_id,
    dispatcher_id: row.dispatcher_id,
    priority: row.priority,
    status: row.status,
    assigned_at: toIso(row.assigned_at),
    arrived_at: toIso(row.arrived_at),
    repairing_at: toIso(row.repairing_at),
    restored_at: toIso(row.restored_at),
    closed_at: toIso(row.closed_at)
  };
}

export const createRepairTicketListDto = (rows: RepairTicketRow[]): RepairTicketDto[] => rows.map(createRepairTicketDto);
