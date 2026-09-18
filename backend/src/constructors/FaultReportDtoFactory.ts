import type { FaultReportRow } from "../database/types";

export type FaultReportDto = FaultReportRow;

export function createFaultReportDto(row: FaultReportRow): FaultReportDto {
  return { ...row };
}

export const createFaultReportListDto = (rows: FaultReportRow[]): FaultReportDto[] => rows.map(createFaultReportDto);
