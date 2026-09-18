import type { FaultReport } from "../types/FaultReport";

export const createDefaultFaultReport = (overrides: Partial<FaultReport> = {}): FaultReport => ({
  id: 0,
  reporter_name: "",
  phone: "",
  asset_id: null,
  fault_type: "OUTAGE",
  address_desc: "",
  severity: "MINOR",
  report_channel: "HOTLINE",
  status: "RECEIVED",
  ...overrides
});

/** 报修登记表单默认对象 */
export const createFaultReportForm = createDefaultFaultReport;
export const createFaultReportResponse = (row: Partial<FaultReport>): FaultReport => createDefaultFaultReport(row);
