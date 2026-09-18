import { getDataGateway } from "../database/gatewayFactory";
import type { UnitOfWork } from "../database/DataGateway";
import type { FaultReportRow } from "../database/types";

/** 故障报修数据访问层 */
export const faultReportRepository = {
  findAll(uow?: UnitOfWork): Promise<FaultReportRow[]> {
    return (uow ?? getDataGateway()).findFaultReports();
  },
  findById(id: number, uow?: UnitOfWork): Promise<FaultReportRow | null> {
    return (uow ?? getDataGateway()).findFaultReportById(id);
  },
  markConverted(id: number, uow: UnitOfWork): Promise<void> {
    return uow.updateFaultReport(id, { status: "CONVERTED" });
  }
};
