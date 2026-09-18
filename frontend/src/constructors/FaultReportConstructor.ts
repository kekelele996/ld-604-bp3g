import type { FaultReport } from "../types/FaultReport";

/** 报修登记表单默认对象。 */
export const createFaultReportForm = () => ({
  reporter_name: "",
  phone: "",
  asset_id: null as number | null,
  fault_type: "OUTAGE" as string,
  address_desc: "",
  severity: "MEDIUM" as string,
  report_channel: "HOTLINE",
});

export const createDefaultFaultReport = (overrides: Partial<FaultReport> = {}): FaultReport => ({
  id: 0,
  reporterName: "",
  phone: "",
  assetId: null,
  assetCode: null,
  assetType: null,
  faultType: "OUTAGE",
  faultTypeText: "停电",
  addressDesc: null,
  severity: "MEDIUM",
  severityText: "一般",
  reportChannel: "HOTLINE",
  status: "WAIT_DISPATCH",
  mergedIntoId: null,
  ticketId: null,
  ...overrides,
});

export const createFaultReportResponse = createDefaultFaultReport;
