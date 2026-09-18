import type { Severity } from "../constants/Severity";

export interface FaultReport {
  id: number;
  reporter_name: string;
  phone: string;
  asset_id: number | null;
  fault_type: string;
  address_desc: string;
  severity: Severity;
  report_channel: string;
  status: "RECEIVED" | "MERGED" | "CONVERTED" | string;
}
