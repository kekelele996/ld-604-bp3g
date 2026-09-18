import type { UsageView } from "../repositories/SparePartUsageRepository";
import { PART_USAGE_STATUS_TEXT } from "../constants/statusText";

export function toSparePartUsageDto(row: UsageView) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    ticketStatus: row.ticket_status,
    partCode: row.part_code,
    partName: row.part_name,
    quantity: row.quantity,
    warehouseName: row.warehouse_name,
    usageStatus: row.usage_status,
    usageStatusText: PART_USAGE_STATUS_TEXT[row.usage_status as keyof typeof PART_USAGE_STATUS_TEXT] ?? row.usage_status,
    requestedBy: row.requested_by,
    approvedBy: row.approved_by,
    rejectedBy: row.rejected_by,
    approvedAt: row.approved_at,
    currentStock: Number(row.part_stock ?? 0),
    createdAt: row.created_at,
    version: row.version,
  };
}

export function toSparePartUsageListDto(rows: UsageView[]) {
  return rows.map(toSparePartUsageDto);
}
