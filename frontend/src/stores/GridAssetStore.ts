import { defineStore } from "pinia";
import { listGridAsset, listFeederLines, updateAssetHealth } from "../api/GridAsset";
import type { GridAsset } from "../types/GridAsset";

export const useGridAssetStore = defineStore("gridAsset", {
  state: () => ({
    rows: [] as GridAsset[],
    feederLines: [] as string[],
    loading: false,
    filterLine: "",
    filterHealth: "",
  }),
  actions: {
    async load() {
      this.loading = true;
      try {
        this.rows = await listGridAsset({
          feederLine: this.filterLine || undefined,
          healthStatus: this.filterHealth || undefined,
        });
      } finally {
        this.loading = false;
      }
    },
    async loadFeederLines() {
      this.feederLines = await listFeederLines();
    },
    async changeHealth(id: number, health: string) {
      await updateAssetHealth(id, health);
      await this.load();
    },
  },
});
