import type { Crew } from "../types/Crew";

export const createCrewForm = () => ({
  name: "",
  skill_tags: "OUTAGE",
  duty_status: "ON_DUTY",
  contact_phone: "",
});

export const createDefaultCrew = (overrides: Partial<Crew> = {}): Crew => ({
  id: 0,
  name: "",
  leaderId: null,
  skillTags: "",
  skillList: [],
  dutyStatus: "ON_DUTY",
  dutyStatusText: "值班",
  currentTicketId: null,
  contactPhone: null,
  idle: true,
  available: false,
  busyReason: null,
  ...overrides,
});

export const createCrewResponse = createDefaultCrew;
