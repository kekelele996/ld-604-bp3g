import type { PartUsageStatus } from "../constants/PartUsageStatus";

export interface SparePartUsage {
  id: number;
  ticketId: number;
  ticketStatus: string;
  partCode: string;
  partName: string;
  quantity: number;
  warehouseName: string;
  usageStatus: PartUsageStatus | string;
  usageStatusText: string;
  requestedBy: number | null;
  approvedBy: number | null;
  rejectedBy: number | null;
  approvedAt: string | null;
  currentStock: number;
  createdAt?: string;
  version: number;
}

export interface SparePart {
  id: number;
  part_code: string;
  part_name: string;
  warehouse_name: string;
  stock: number;
  safety_stock: number;
}

export interface InventoryTransaction {
  id: number;
  part_code: string;
  change_qty: number;
  balance_after: number;
  tx_type: "OUTBOUND" | "RETURN" | "ADJUST" | string;
  usage_id: number | null;
  ticket_id: number | null;
  operator_id: number | null;
  remark: string | null;
  created_at?: string;
}
