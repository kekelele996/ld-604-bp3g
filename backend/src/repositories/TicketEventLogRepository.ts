import { getDataGateway } from "../database/gatewayFactory";
import type { UnitOfWork } from "../database/DataGateway";
import type { TicketEventLogRow } from "../database/types";

/** 工单状态事件（时间线）数据访问层 */
export const ticketEventLogRepository = {
  findByTicketId(ticketId: number, uow?: UnitOfWork): Promise<TicketEventLogRow[]> {
    return (uow ?? getDataGateway()).findTicketEventLogs(ticketId);
  },
  findAll(uow?: UnitOfWork): Promise<TicketEventLogRow[]> {
    return (uow ?? getDataGateway()).findTicketEventLogs();
  },
  insert(
    row: Omit<TicketEventLogRow, "id" | "created_at">,
    uow: UnitOfWork
  ): Promise<TicketEventLogRow> {
    return uow.insertTicketEventLog(row);
  }
};
