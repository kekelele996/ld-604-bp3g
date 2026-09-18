import type { FaultReportView } from "../repositories/FaultReportRepository";
import { FAULT_TYPE_TEXT, SEVERITY_TEXT } from "../constants/statusText";

export function toFaultReportDto(row: FaultReportView) {
  return {
    id: row.id,
    reporterName: row.reporter_name,
    phone: row.phone,
    assetId: row.asset_id,
    assetCode: row.asset_code,
    assetType: row.asset_type,
    faultType: row.fault_type,
    faultTypeText: FAULT_TYPE_TEXT[row.fault_type] ?? row.fault_type,
    addressDesc: row.address_desc,
    severity: row.severity,
    severityText: SEVERITY_TEXT[row.severity as keyof typeof SEVERITY_TEXT] ?? row.severity,
    reportChannel: row.report_channel,
    status: row.status,
    mergedIntoId: row.merged_into_id,
    ticketId: row.ticket_id,
    createdAt: row.created_at,
  };
}

export function toFaultReportListDto(rows: FaultReportView[]) {
  return rows.map(toFaultReportDto);
}
