import { get, post } from "./http";
import type { FaultReport } from "../types/FaultReport";

export interface RegisterFaultPayload {
  reporter_name: string;
  phone: string;
  asset_id?: number | null;
  fault_type: string;
  address_desc: string;
  severity: string;
  report_channel: string;
}

export const listFaultReport = () => get<FaultReport[]>("/fault-report");
export const registerFaultReport = (payload: RegisterFaultPayload) => post<FaultReport>("/fault-report", payload);
