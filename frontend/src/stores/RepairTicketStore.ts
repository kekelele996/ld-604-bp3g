import { defineStore } from "pinia";
import {
  listRepairTickets,
  dispatchTicket as apiDispatch,
  advanceTicket as apiAdvance,
  closeTicket as apiClose,
  createTicketFromFault as apiCreateFromFault
} from "../api/RepairTicket";
import type { DispatchPartLine, RepairTicket } from "../types/RepairTicket";
import { TICKET_STATUS_FLOW, type TicketStatus } from "../constants/TicketStatus";
import type { Severity } from "../constants/Severity";

/** 抢修工单 store：列表加载、派工、状态机推进（写操作后自动刷新，保证 UI 与后端一致） */
export const useRepairTicketStore = defineStore("repairTicket", {
  state: () => ({
    rows: [] as RepairTicket[],
    loading: false,
    actingId: null as number | null
  }),
  getters: {
    waitingCount: (state) => state.rows.filter((t) => t.status === "WAIT_DISPATCH").length,
    activeCount: (state) => state.rows.filter((t) => ["ASSIGNED", "ARRIVED", "REPAIRING"].includes(t.status)).length,
    restoredCount: (state) => state.rows.filter((t) => t.status === "RESTORED").length,
    closedCount: (state) => state.rows.filter((t) => t.status === "CLOSED").length,
    /** 按严重度排序的待派工队列：危急优先 */
    waitingQueue(state): RepairTicket[] {
      const rank: Record<Severity, number> = { CRITICAL: 0, MAJOR: 1, MINOR: 2 };
      return state.rows
        .filter((t) => t.status === "WAIT_DISPATCH")
        .slice()
        .sort((a, b) => (rank[a.priority ?? "MINOR"] ?? 2) - (rank[b.priority ?? "MINOR"] ?? 2) || a.id - b.id);
    },
    /** 平均复电时长（毫秒）：RESTORED/CLOSED 且有 assigned/restored 时间 */
    averageRestoreMs(): number | null {
      const done = this.rows.filter(
        (t: RepairTicket) => t.restored_at && t.assigned_at && ["RESTORED", "CLOSED"].includes(t.status)
      );
      if (done.length === 0) return null;
      const total = done.reduce(
        (sum: number, t: RepairTicket) => sum + (new Date(t.restored_at!).getTime() - new Date(t.assigned_at!).getTime()),
        0
      );
      return total / done.length;
    }
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        this.rows = await listRepairTickets();
      } finally {
        this.loading = false;
      }
    },
    nextStatusOf(status: TicketStatus): TicketStatus | null {
      return TICKET_STATUS_FLOW[status];
    },
    async createFromFault(faultReportId: number) {
      const ticket = await apiCreateFromFault(faultReportId);
      await this.load();
      return ticket;
    },
    async dispatch(id: number, teamId: number, parts: DispatchPartLine[]) {
      this.actingId = id;
      try {
        const result = await apiDispatch(id, teamId, parts);
        await this.load();
        return result;
      } finally {
        this.actingId = null;
      }
    },
    async advance(id: number, target: TicketStatus, remark?: string) {
      this.actingId = id;
      try {
        const ticket = await apiAdvance(id, target, remark);
        await this.load();
        return ticket;
      } finally {
        this.actingId = null;
      }
    },
    async close(id: number, remark?: string) {
      this.actingId = id;
      try {
        const ticket = await apiClose(id, remark);
        await this.load();
        return ticket;
      } finally {
        this.actingId = null;
      }
    }
  }
});
