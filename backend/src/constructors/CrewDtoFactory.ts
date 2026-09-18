import type { Crew } from "../models/Crew";
import { DUTY_STATUS_TEXT } from "../constants/statusText";
import { parseSkillTags } from "../utils/formatters";

/** 班组响应构造器：解析技能、标注空闲与可接单（可指定故障类型）。 */
export function toCrewDto(row: Crew, requiredFaultType?: string) {
  const skillList = parseSkillTags(row.skill_tags);
  const onDuty = row.duty_status === "ON_DUTY";
  const idle = row.current_ticket_id == null;
  const skillOk = !requiredFaultType || skillList.includes(requiredFaultType);
  return {
    id: row.id,
    name: row.name,
    leaderId: row.leader_id,
    skillTags: row.skill_tags,
    skillList,
    dutyStatus: row.duty_status,
    dutyStatusText: DUTY_STATUS_TEXT[row.duty_status as keyof typeof DUTY_STATUS_TEXT] ?? row.duty_status,
    currentTicketId: row.current_ticket_id,
    contactPhone: row.contact_phone,
    idle,
    available: onDuty && idle && skillOk,
  };
}

export function toCrewListDto(rows: Crew[], requiredFaultType?: string) {
  return rows.map((r) => toCrewDto(r, requiredFaultType));
}
