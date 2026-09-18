import { defineStore } from "pinia";
import { listCrew, setCrewDuty } from "../api/Crew";
import type { Crew } from "../types/Crew";
import { SEVERITY_SKILL_RULE, type Severity } from "../constants/Severity";

/**
 * 抢修班组 store：
 * eligibleFor(severity) 按“值班 + 空闲 + 技能覆盖严重度”过滤可接单班组。
 */
export const useCrewStore = defineStore("crew", {
  state: () => ({ rows: [] as Crew[], loading: false }),
  getters: {
    onDutyCount: (state) => state.rows.filter((c) => c.duty_status === "ON_DUTY").length,
    idleCount: (state) => state.rows.filter((c) => c.available).length,
    /** 返回可接单班组过滤函数（派工面板与 Dashboard 共用） */
    eligibleCrews(state): (severity: Severity) => Crew[] {
      return (severity: Severity) => {
        const required = SEVERITY_SKILL_RULE[severity] ?? [];
        return state.rows.filter((c) => {
          if (!c.available) return false;
          if (required.length === 0) return true;
          return required.some((tag) => c.skill_tags.includes(tag));
        });
      };
    }
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        this.rows = await listCrew();
      } finally {
        this.loading = false;
      }
    },
    async toggleDuty(id: number, next: "ON_DUTY" | "OFF_DUTY") {
      await setCrewDuty(id, next);
      await this.load();
    }
  }
});
