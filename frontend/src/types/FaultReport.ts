import type { FaultType } from "../constants/FaultType";
import type { Severity } from "../constants/Severity";

export interface FaultReport {
  id: number;
  reporterName: string;
  phone: string;
  assetId: number | null;
  assetCode: string | null;
  assetType: string | null;
  faultType: FaultType | string;
  faultTypeText: string;
  addressDesc: string | null;
  severity: Severity | string;
  severityText: string;
  reportChannel: string;
  status: "WAIT_DISPATCH" | "TICKET_CREATED" | "DUPLICATED" | string;
  mergedIntoId: number | null;
  ticketId: number | null;
  createdAt?: string;
}
