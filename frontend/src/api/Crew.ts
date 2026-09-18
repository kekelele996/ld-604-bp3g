import { get, post } from "./http";
import type { Crew } from "../types/Crew";

export const listCrew = () => get<Crew[]>("/crew");
export const setCrewDuty = (id: number, dutyStatus: "ON_DUTY" | "OFF_DUTY") =>
  post<Crew>(`/crew/${id}/duty`, { duty_status: dutyStatus });
