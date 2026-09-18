import type { TicketWithRelations } from "../repositories/RepairTicketRepository";
import { TICKET_STATUS_TEXT } from "../constants/statusText";
import { durationMinutes } from "../utils/formatters";

/** 工单列表/详情统一响应构造器：补状态文案与复电耗时。 */
export function toRepairTicketDto(row: TicketWithRelations) {
  return {
    id: row.id,
    faultReportId: row.fault_report_id,
    teamId: row.team_id,
    dispatcherId: row.dispatcher_id,
    priority: row.priority,
    status: row.status,
    statusText: TICKET_STATUS_TEXT[row.status as keyof typeof TICKET_STATUS_TEXT] ?? row.status,
    faultType: row.fault_type,
    severity: row.severity,
    reporterName: row.reporter_name,
    teamName: row.team_name,
    dispatcherName: row.dispatcher_name,
    assignedAt: row.assigned_at,
    arrivedAt: row.arrived_at,
    repairStartedAt: row.repair_started_at,
    restoredAt: row.restored_at,
    closedAt: row.closed_at,
    restoreMinutes: durationMinutes(row.assigned_at, row.restored_at),
    version: row.version,
  };
}

export function toRepairTicketListDto(rows: TicketWithRelations[]) {
  return rows.map(toRepairTicketDto);
}
