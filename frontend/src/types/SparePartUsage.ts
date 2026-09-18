export interface SparePart {
  id: number;
  part_code: string;
  part_name: string;
  warehouse_name: string;
  stock_quantity: number;
}

export interface SparePartUsage {
  id: number;
  ticket_id: number;
  part_code: string;
  part_name: string;
  quantity: number;
  warehouse_name: string;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
  usage_status: "PENDING" | "APPROVED" | "REJECTED" | "CONSUMED" | "RETURNED" | string;
}

export interface InventoryTransaction {
  id: number;
  part_code: string;
  change_type: "RESERVE" | "REJECT_RETURN" | "CONSUME" | "MANUAL_ADJUST" | string;
  quantity: number;
  balance_after: number;
  ticket_id: number | null;
  usage_id: number | null;
  operator_id: number | null;
  remark: string | null;
  created_at: string;
}
