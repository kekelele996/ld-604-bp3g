export interface RepairTicket {
  id: number;
  fault_report_id: number;
  team_id: number | null;
  dispatcher_id: number | null;
  priority: "P1" | "P2" | "P3" | "P4" | string;
  status: "WAIT_DISPATCH" | "ASSIGNED" | "ARRIVED" | "REPAIRING" | "RESTORED" | "CLOSED";
  assigned_at: string | null;
  arrived_at: string | null;
  repair_started_at: string | null;
  restored_at: string | null;
  closed_at: string | null;
  created_at?: string;
  version: number;
}
