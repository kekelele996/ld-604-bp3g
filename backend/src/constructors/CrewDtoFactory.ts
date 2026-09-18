import type { CrewRow } from "../database/types";
import { parseSkillTags } from "../utils/CrewEligibility";

export interface CrewDto {
  id: number;
  name: string;
  leader_id: number;
  skill_tags: string[];
  duty_status: string;
  current_ticket_id: number | null;
  contact_phone: string;
  /** 派生字段：值班且未占用工单才可接单 */
  available: boolean;
}

export function createCrewDto(row: CrewRow): CrewDto {
  return {
    id: row.id,
    name: row.name,
    leader_id: row.leader_id,
    skill_tags: parseSkillTags(row.skill_tags),
    duty_status: row.duty_status,
    current_ticket_id: row.current_ticket_id,
    contact_phone: row.contact_phone,
    available: row.duty_status === "ON_DUTY" && row.current_ticket_id === null
  };
}

export const createCrewListDto = (rows: CrewRow[]): CrewDto[] => rows.map(createCrewDto);
