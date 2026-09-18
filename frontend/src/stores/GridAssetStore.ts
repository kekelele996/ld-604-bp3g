import { defineStore } from "pinia";
import { listGridAsset } from "../api/GridAsset";
import type { GridAsset } from "../types/GridAsset";

export const useGridAssetStore = defineStore("gridAsset", {
  state: () => ({ rows: [] as GridAsset[], loading: false }),
  getters: {
    feederLines: (state) => Array.from(new Set(state.rows.map((a) => a.feeder_line))),
    dangerousCount: (state) => state.rows.filter((a) => a.health_status === "DANGEROUS").length
  },
  actions: {
    async load() {
      this.loading = true;
      try {
        this.rows = await listGridAsset();
      } finally {
        this.loading = false;
      }
    }
  }
});
