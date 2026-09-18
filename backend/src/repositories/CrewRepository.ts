import { getDataGateway } from "../database/gatewayFactory";
import type { UnitOfWork, UpdateOutcome } from "../database/DataGateway";
import type { CrewRow } from "../database/types";

/** 抢修班组数据访问层 */
export const crewRepository = {
  findAll(uow?: UnitOfWork): Promise<CrewRow[]> {
    return (uow ?? getDataGateway()).findCrews();
  },
  findById(id: number, uow?: UnitOfWork): Promise<CrewRow | null> {
    return (uow ?? getDataGateway()).findCrewById(id);
  },
  /** 仅当班组值班且空闲（current_ticket_id IS NULL）时占位（并发派工只有一个事务命中） */
  occupyIfIdle(id: number, ticketId: number, uow: UnitOfWork): Promise<UpdateOutcome<CrewRow>> {
    return uow.updateCrewIf(
      id,
      { duty_status: "ON_DUTY", current_ticket_id: null },
      { current_ticket_id: ticketId }
    );
  },
  /** 仅当班组当前占用的就是该工单时释放（关闭时） */
  releaseIfHolding(id: number, ticketId: number, uow: UnitOfWork): Promise<UpdateOutcome<CrewRow>> {
    return uow.updateCrewIf(id, { current_ticket_id: ticketId }, { current_ticket_id: null });
  }
};
