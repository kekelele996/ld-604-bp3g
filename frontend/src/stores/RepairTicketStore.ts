import { defineStore } from "pinia";
import {
  listRepairTickets,
  getRepairTicket,
  dispatchTicket,
  dispatchWithParts,
  transitionTicket,
  applyPart,
} from "../api/RepairTicket";
import type { RepairTicket } from "../types/RepairTicket";
import type { TicketStatus } from "../constants/TicketStatus";

export const useRepairTicketStore = defineStore("repairTicket", {
  state: () => ({
    rows: [] as RepairTicket[],
    detail: null as RepairTicket | null,
    loading: false,
    filterStatus: "",
  }),
  getters: {
    waiting: (s) => s.rows.filter((t) => t.status === "WAIT_DISPATCH"),
    inProgress: (s) => s.rows.filter((t) => ["ASSIGNED", "ARRIVED", "REPAIRING"].includes(t.status)),
    closed: (s) => s.rows.filter((t) => t.status === "CLOSED"),
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        this.rows = await listRepairTickets(this.filterStatus || undefined);
      } finally {
        this.loading = false;
      }
    },
    async loadDetail(id: number) {
      this.detail = await getRepairTicket(id);
      return this.detail;
    },
    /** 并发安全：后端条件更新保证只成功一次，失败时刷新列表拿到最新状态。 */
    async dispatch(ticketId: number, teamId: number) {
      await dispatchTicket(ticketId, teamId);
      await this.load();
    },
    async dispatchParts(ticketId: number, teamId: number, parts: Array<{ partCode: string; quantity: number }>) {
      await dispatchWithParts(ticketId, teamId, parts);
      await this.load();
    },
    async advance(ticketId: number, status: TicketStatus, version?: number, note?: string) {
      await transitionTicket(ticketId, status, note, version);
      await this.load();
      if (this.detail?.id === ticketId) await this.loadDetail(ticketId);
    },
    async applyPart(ticketId: number, partCode: string, quantity: number) {
      await applyPart(ticketId, partCode, quantity);
      if (this.detail?.id === ticketId) await this.loadDetail(ticketId);
    },
  },
});
