import type { GridAsset } from "../types/GridAsset";

export const createDefaultGridAsset = (overrides: Partial<GridAsset> = {}): GridAsset => ({
  id: 0,
  asset_code: "",
  asset_type: "",
  feeder_line: "",
  voltage_level: "",
  location_desc: "",
  health_status: "NORMAL",
  owner_team_id: null,
  ...overrides
});

export const createGridAssetForm = createDefaultGridAsset;
export const createGridAssetResponse = (row: Partial<GridAsset>): GridAsset => createDefaultGridAsset(row);
