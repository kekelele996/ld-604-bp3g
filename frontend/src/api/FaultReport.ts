import { get, post } from "./http";
import type { FaultReport } from "../types/FaultReport";
import type { FaultType } from "../constants/FaultType";
import type { Severity } from "../constants/Severity";

export interface FaultCreatePayload {
  reporter_name: string;
  phone: string;
  asset_id?: number | null;
  fault_type: FaultType | string;
  address_desc?: string;
  severity: Severity | string;
  report_channel?: string;
}

export function listFaultReport(params: { status?: string; severity?: string } = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();
  return get<FaultReport[]>(`/fault-report${qs ? `?${qs}` : ""}`);
}

export function createFaultReport(payload: FaultCreatePayload) {
  return post<FaultReport>("/fault-report", payload);
}

export function mergeFaultReport(id: number, targetId: number) {
  return post<{ sourceId: number; mergedInto: number }>(`/fault-report/${id}/merge`, { targetId });
}

export function createTicketFromFault(id: number) {
  return post<{ faultId: number; ticketId: number }>(`/fault-report/${id}/create-ticket`, {});
}
