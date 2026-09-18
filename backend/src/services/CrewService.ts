import { getDataGateway } from "../database/gatewayFactory";
import { crewRepository } from "../repositories/CrewRepository";
import { createCrewListDto } from "../constructors/CrewDtoFactory";
import { AppError } from "../utils/AppError";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import type { CrewRow } from "../database/types";
import type { UnitOfWork } from "../database/DataGateway";
import { renderMessage } from "../constants/errorMessages";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import type { ActorContext } from "./RepairTicketService";

/** 班组台账与值班状态维护 */
export const crewService = {
  async list() {
    const rows = await crewRepository.findAll();
    return createCrewListDto(rows);
  },

  /** 切换值班/休班（正在占用工单的班组不允许下班） */
  async toggleDuty(crewId: number, dutyStatus: "ON_DUTY" | "OFF_DUTY", actor: ActorContext) {
    const gateway = getDataGateway();
    return gateway.runInTransaction(async (uow: UnitOfWork) => {
      const crew = await crewRepository.findById(crewId, uow);
      if (!crew) throw AppError.notFound(ERROR_CODES.CREW_NOT_FOUND, ERROR_MESSAGES.CREW_NOT_FOUND);
      if (dutyStatus === "OFF_DUTY" && crew.current_ticket_id !== null) {
        throw new AppError(ERROR_CODES.CREW_BUSY, "班组正在执行工单，不能切换为休班", 409);
      }
      const outcome = await uow.updateCrewIf(crewId, { id: crewId }, { duty_status: dutyStatus });
      if (outcome.affected === 0) {
        throw AppError.conflict(ERROR_CODES.TICKET_STATUS_CONFLICT, ERROR_MESSAGES.TICKET_STATUS_CONFLICT);
      }
      await uow.insertAuditLog({
        actor: actor.userName,
        action: "Crew.status",
        target_type: "Crew",
        target_id: String(crewId),
        detail: renderMessage(LOG_TEMPLATES.Crew[2], { name: crew.name, from: crew.duty_status, to: dutyStatus })
      });
      const rows = await crewRepository.findById(crewId, uow);
      return createCrewListDto(rows ? [rows as CrewRow] : [])[0];
    });
  }
};
