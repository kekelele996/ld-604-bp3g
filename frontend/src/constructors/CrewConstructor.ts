import type { Crew } from "../types/Crew";

export const createDefaultCrew = (overrides: Partial<Crew> = {}): Crew => ({
  id: 0,
  name: "",
  leader_id: 0,
  skill_tags: [],
  duty_status: "ON_DUTY",
  current_ticket_id: null,
  contact_phone: "",
  available: true,
  ...overrides
});

export const createCrewForm = createDefaultCrew;
export const createCrewResponse = (row: Partial<Crew>): Crew => createDefaultCrew(row);
