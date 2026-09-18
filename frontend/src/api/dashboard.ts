import { get } from "./http";

export interface DashboardOverview {
  ticketByStatus: Record<string, number>;
  crew: { onDuty: number; idle: number };
  faults: { pendingDispatch: number; open: number };
  averageRestoreMinutes: number | null;
  lowStockParts: Array<{ part_code: string; part_name: string; stock: number; safety_stock: number }>;
  pendingPartApprovals: number;
}

export function getDashboardOverview() {
  return get<DashboardOverview>("/dashboard/overview");
}
