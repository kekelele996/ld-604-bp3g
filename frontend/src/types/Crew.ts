export interface Crew {
  id: number;
  name: string;
  leader_id: number;
  /** DTO 中已被后端工厂拆为数组 */
  skill_tags: string[];
  duty_status: "ON_DUTY" | "OFF_DUTY" | string;
  current_ticket_id: number | null;
  contact_phone: string;
  /** 值班且空闲才可接单（后端 DTO 派生字段） */
  available: boolean;
}
