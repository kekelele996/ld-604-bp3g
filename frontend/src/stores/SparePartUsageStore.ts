import { defineStore } from "pinia";
import {
  listParts,
  listUsages,
  listInventoryTransactions,
  reviewUsage
} from "../api/SparePartUsage";
import type { InventoryTransaction, SparePart, SparePartUsage } from "../types/SparePartUsage";

/** 备件库存、领用记录、库存流水 store */
export const useSparePartUsageStore = defineStore("sparePartUsage", {
  state: () => ({
    parts: [] as SparePart[],
    usages: [] as SparePartUsage[],
    transactions: [] as InventoryTransaction[],
    loading: false
  }),
  getters: {
    pendingUsages: (state) => state.usages.filter((u) => u.usage_status === "PENDING"),
    stockByCode: (state) => (code: string) => state.parts.find((p) => p.part_code === code)?.stock_quantity ?? 0
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        const [parts, usages, transactions] = await Promise.all([
          listParts(),
          listUsages(),
          listInventoryTransactions()
        ]);
        this.parts = parts;
        this.usages = usages;
        this.transactions = transactions;
      } finally {
        this.loading = false;
      }
    },
    async loadUsages() {
      this.usages = await listUsages();
    },
    async approve(id: number, remark?: string) {
      const usage = await reviewUsage(id, "APPROVED", remark);
      await this.load();
      return usage;
    },
    async reject(id: number, remark?: string) {
      const usage = await reviewUsage(id, "REJECTED", remark);
      await this.load();
      return usage;
    }
  }
});
