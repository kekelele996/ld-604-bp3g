import { defineStore } from "pinia";
import { listCrew, setCrewDuty } from "../api/Crew";
import type { Crew } from "../types/Crew";

export const useCrewStore = defineStore("crew", {
  state: () => ({ rows: [] as Crew[], loading: false }),
  getters: {
    onDutyCrews: (s) => s.rows.filter((c) => c.dutyStatus === "ON_DUTY"),
    idleCrews: (s) => s.rows.filter((c) => c.available),
  },
  actions: {
    async load(faultType?: string) {
      this.loading = true;
      try {
        this.rows = await listCrew(faultType);
      } finally {
        this.loading = false;
      }
    },
    async toggleDuty(crew: Crew) {
      const next = crew.dutyStatus === "ON_DUTY" ? "OFF_DUTY" : "ON_DUTY";
      await setCrewDuty(crew.id, next);
      await this.load();
    },
  },
});
