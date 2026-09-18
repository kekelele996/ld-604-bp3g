import { getDataGateway } from "../database/gatewayFactory";
import type { UnitOfWork, UpdateOutcome } from "../database/DataGateway";
import type { RepairTicketRow } from "../database/types";

/**
 * 抢修工单数据访问层。
 * dispatchIfWaiting / advanceIf 均为带状态条件的原子更新，
 * affected=0 意味着并发竞争失败，由 service 抛出 409。
 */
export const repairTicketRepository = {
  findAll(uow?: UnitOfWork): Promise<RepairTicketRow[]> {
    return (uow ?? getDataGateway()).findTickets();
  },
  findById(id: number, uow?: UnitOfWork): Promise<RepairTicketRow | null> {
    return (uow ?? getDataGateway()).findTicketById(id);
  },
  findByFaultReportId(faultReportId: number, uow?: UnitOfWork): Promise<RepairTicketRow | null> {
    return (uow ?? getDataGateway()).findTicketByFaultReportId(faultReportId);
  },
  insert(row: Omit<RepairTicketRow, "id">, uow: UnitOfWork): Promise<RepairTicketRow> {
    return uow.insertTicket(row);
  },
  /** 仅当工单仍为 WAIT_DISPATCH 时占位派工（并发派工只有一个事务命中） */
  dispatchIfWaiting(
    id: number,
    patch: Partial<RepairTicketRow>,
    uow: UnitOfWork
  ): Promise<UpdateOutcome<RepairTicketRow>> {
    return uow.updateTicketIf(id, { status: "WAIT_DISPATCH" }, patch);
  },
  /** 仅当工单处于期望旧状态时推进（状态机裁决，防跳跃/回退） */
  advanceIf(
    id: number,
    expectedStatus: string,
    patch: Partial<RepairTicketRow>,
    uow: UnitOfWork
  ): Promise<UpdateOutcome<RepairTicketRow>> {
    return uow.updateTicketIf(id, { status: expectedStatus }, patch);
  }
};
