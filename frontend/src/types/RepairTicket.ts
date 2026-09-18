import type { TicketStatus } from "../constants/TicketStatus";
import type { Severity } from "../constants/Severity";

export interface TicketEvent {
  id: number;
  ticket_id: number;
  from_status: string | null;
  to_status: TicketStatus;
  actor_id: number | null;
  actor_name: string | null;
  note: string | null;
  created_at?: string;
}

export interface RepairTicket {
  id: number;
  faultReportId: number;
  teamId: number | null;
  dispatcherId: number | null;
  priority: "P1" | "P2" | "P3" | "P4" | string;
  status: TicketStatus;
  statusText: string;
  faultType: string;
  severity: Severity | string;
  reporterName: string;
  teamName: string | null;
  dispatcherName: string | null;
  assignedAt: string | null;
  arrivedAt: string | null;
  repairStartedAt: string | null;
  restoredAt: string | null;
  closedAt: string | null;
  restoreMinutes: number | null;
  version: number;
  events?: TicketEvent[];
}
