export interface Crew {
  id: number;
  name: string;
  leader_id: number | null;
  skill_tags: string;
  duty_status: "ON_DUTY" | "OFF_DUTY" | string;
  current_ticket_id: number | null;
  contact_phone: string | null;
  updated_at?: string;
}

/** 派工页需要的班组视图：技能解析为数组，并带是否可接单标记。 */
export interface CrewAvailabilityView extends Crew {
  skill_list: string[];
  available: boolean;
  busy_reason: string | null;
}
