export interface SparePartUsage {
  id: number;
  ticket_id: number;
  part_code: string;
  part_name: string;
  quantity: number;
  warehouse_name: string;
  usage_status: "PENDING" | "APPROVED" | "REJECTED" | "CONSUMED" | "RETURNED" | string;
  requested_by: number | null;
  approved_by: number | null;
  rejected_by: number | null;
  created_at?: string;
  approved_at: string | null;
  version: number;
}
