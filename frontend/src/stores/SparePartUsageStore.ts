import { defineStore } from "pinia";
import {
  listSparePartUsage,
  listSparePartCatalog,
  listInventoryTransactions,
  approvePartUsage,
  rejectPartUsage,
  returnPartUsage,
} from "../api/SparePartUsage";
import type { SparePartUsage, SparePart, InventoryTransaction } from "../types/SparePartUsage";

export const useSparePartUsageStore = defineStore("sparePartUsage", {
  state: () => ({
    rows: [] as SparePartUsage[],
    catalog: [] as SparePart[],
    transactions: [] as InventoryTransaction[],
    loading: false,
  }),
  getters: {
    pending: (s) => s.rows.filter((r) => r.usageStatus === "PENDING"),
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        const [usages, parts] = await Promise.all([listSparePartUsage(), listSparePartCatalog()]);
        this.rows = usages;
        this.catalog = parts;
      } finally {
        this.loading = false;
      }
    },
    async loadTransactions(partCode?: string) {
      this.transactions = await listInventoryTransactions(partCode);
    },
    async approve(id: number) {
      await approvePartUsage(id);
      await this.load();
    },
    async reject(id: number, reason: string) {
      await rejectPartUsage(id, reason);
      await this.load();
    },
    async returnPart(id: number, quantity?: number) {
      await returnPartUsage(id, quantity);
      await this.load();
    },
  },
});
