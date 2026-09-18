export interface FaultReport {
  id: number;
  reporter_name: string;
  phone: string;
  asset_id: number | null;
  fault_type: string;
  address_desc: string | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  report_channel: string;
  status: "WAIT_DISPATCH" | "TICKET_CREATED" | "DUPLICATED" | string;
  merged_into_id: number | null;
  ticket_id: number | null;
  created_at?: string;
}
