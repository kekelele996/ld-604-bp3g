import { defineStore } from "pinia";
import { listFaultReport, registerFaultReport, type RegisterFaultPayload } from "../api/FaultReport";
import type { FaultReport } from "../types/FaultReport";

export const useFaultReportStore = defineStore("faultReport", {
  state: () => ({ rows: [] as FaultReport[], loading: false }),
  getters: {
    receivedCount: (state) => state.rows.filter((r) => r.status === "RECEIVED").length,
    convertedCount: (state) => state.rows.filter((r) => r.status === "CONVERTED").length
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        this.rows = await listFaultReport();
      } finally {
        this.loading = false;
      }
    },
    async register(payload: RegisterFaultPayload) {
      const row = await registerFaultReport(payload);
      await this.load();
      return row;
    }
  }
});
