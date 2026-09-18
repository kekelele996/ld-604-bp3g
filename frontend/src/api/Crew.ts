import { get, post, patch } from "./http";
import type { Crew } from "../types/Crew";

export function listCrew(faultType?: string) {
  const qs = faultType ? `?faultType=${encodeURIComponent(faultType)}` : "";
  return get<Crew[]>(`/crew${qs}`);
}

export function createCrew(payload: { name: string; skill_tags: string; duty_status: string; contact_phone?: string }) {
  return post<Crew>("/crew", payload);
}

export function setCrewDuty(id: number, duty_status: "ON_DUTY" | "OFF_DUTY") {
  return patch<{ id: number; duty_status: string }>(`/crew/${id}/duty`, { duty_status });
}
