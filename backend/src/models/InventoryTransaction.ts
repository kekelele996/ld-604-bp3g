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
