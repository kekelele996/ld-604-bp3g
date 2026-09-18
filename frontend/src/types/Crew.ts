export interface Crew {
  id: number;
  name: string;
  leaderId: number | null;
  skillTags: string;
  skillList: string[];
  dutyStatus: "ON_DUTY" | "OFF_DUTY" | string;
  dutyStatusText: string;
  currentTicketId: number | null;
  contactPhone: string | null;
  idle: boolean;
  available: boolean;
  busyReason?: string | null;
}
