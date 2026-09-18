import { crewRepository } from "../repositories/CrewRepository";
import { writeAudit } from "./AuditService";
import { BusinessError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { CrewDutyStatus } from "../constants/CrewDutyStatus";
import { LOG_TEMPLATES, renderLogTemplate } from "../constants/logTemplates";
import { parseSkillTags } from "../utils/formatters";
import type { AuthUser } from "../types/express";

export const crewService = {
  async list(faultType?: string) {
    return crewRepository.listAvailability(faultType);
  },

  async detail(id: number) {
    const crew = await crewRepository.findById(id);
    if (!crew) throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, { id }, 404);
    return { ...crew, skill_list: parseSkillTags(crew.skill_tags) };
  },

  async getByIdOrThrow(id: number) {
    const crew = await crewRepository.findById(id);
    if (!crew) throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, { id }, 404);
    return crew;
  },

  async setDutyStatus(id: number, dutyStatus: string, user: AuthUser) {
    if (!CrewDutyStatus.includes(dutyStatus as (typeof CrewDutyStatus)[number])) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { dutyStatus });
    }
    const crew = await crewRepository.findById(id);
    if (!crew) throw new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, { id }, 404);
    // 有在手工单的班组不允许直接改为休班
    if (dutyStatus === "OFF_DUTY" && crew.current_ticket_id != null) {
      throw new BusinessError(ERROR_CODES.CREW_BUSY, { teamId: id, currentTicketId: crew.current_ticket_id }, 409);
    }
    await crewRepository.setDutyStatus(id, dutyStatus as "ON_DUTY" | "OFF_DUTY");
    const { action, message } = renderLogTemplate(LOG_TEMPLATES.Crew.duty, {
      team_name: crew.name,
      duty_status: dutyStatus,
    });
    await writeAudit({ actor: user, action, targetType: "Crew", targetId: id, detail: message });
    return { id, duty_status: dutyStatus };
  },

  async create(data: { name: string; skill_tags: string; duty_status: string; contact_phone?: string }, user: AuthUser) {
    if (!data.name) throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "name" });
    if (!CrewDutyStatus.includes(data.duty_status as (typeof CrewDutyStatus)[number])) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { duty_status: data.duty_status });
    }
    const id = await crewRepository.create({
      name: data.name,
      skill_tags: data.skill_tags ?? "",
      duty_status: data.duty_status as "ON_DUTY" | "OFF_DUTY",
      contact_phone: data.contact_phone ?? null,
    });
    const { action, message } = renderLogTemplate(LOG_TEMPLATES.Crew.create, {
      team_name: data.name,
      skill_tags: data.skill_tags ?? "",
    });
    await writeAudit({ actor: user, action, targetType: "Crew", targetId: id, detail: message });
    return this.getByIdOrThrow(id);
  },
};
