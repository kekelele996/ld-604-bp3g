import type { TicketStatus } from "../constants/TicketStatus";
import type { Severity } from "../constants/Severity";

export interface RepairTicket {
  id: number;
  fault_report_id: number;
  team_id: number | null;
  dispatcher_id: number | null;
  priority: Severity | null;
  status: TicketStatus;
  assigned_at: string | null;
  arrived_at: string | null;
  repairing_at: string | null;
  restored_at: string | null;
  closed_at: string | null;
}

export interface DispatchPartLine {
  part_code: string;
  quantity: number;
  warehouse_name?: string;
}

export interface DispatchResult {
  ticket: RepairTicket;
  usages: Array<{ id: number; part_code: string; quantity: number; usage_status: string }>;
}

export interface TicketEvent {
  id: number;
  ticket_id: number;
  from_status: string | null;
  to_status: string;
  operator_id: number | null;
  remark: string | null;
  created_at: string;
}
