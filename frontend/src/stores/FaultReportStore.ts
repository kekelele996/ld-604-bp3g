import { defineStore } from "pinia";
import { listFaultReport, createFaultReport, mergeFaultReport, createTicketFromFault } from "../api/FaultReport";
import type { FaultReport } from "../types/FaultReport";
import type { FaultCreatePayload } from "../api/FaultReport";

export const useFaultReportStore = defineStore("faultReport", {
  state: () => ({ rows: [] as FaultReport[], loading: false, filterStatus: "", filterSeverity: "" }),
  getters: {
    pending: (s) => s.rows.filter((r) => r.status === "WAIT_DISPATCH"),
    duplicated: (s) => s.rows.filter((r) => r.status === "DUPLICATED"),
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        this.rows = await listFaultReport({
          status: this.filterStatus || undefined,
          severity: this.filterSeverity || undefined,
        });
      } finally {
        this.loading = false;
      }
    },
    async register(payload: FaultCreatePayload) {
      const created = await createFaultReport(payload);
      await this.load();
      return created;
    },
    async merge(sourceId: number, targetId: number) {
      await mergeFaultReport(sourceId, targetId);
      await this.load();
    },
    async createTicket(id: number) {
      const res = await createTicketFromFault(id);
      await this.load();
      return res;
    },
  },
});
