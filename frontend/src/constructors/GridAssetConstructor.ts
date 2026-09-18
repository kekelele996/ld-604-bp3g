import type { GridAsset } from "../types/GridAsset";

export const createGridAssetForm = () => ({
  asset_code: "",
  asset_type: "TRANSFORMER",
  feeder_line: "",
  voltage_level: "10kV",
  location_desc: "",
  health_status: "NORMAL",
  owner_team_id: null as number | null,
});

export const createDefaultGridAsset = (overrides: Partial<GridAsset> = {}): GridAsset => ({
  id: 0,
  assetCode: "",
  assetType: "",
  feederLine: "",
  voltageLevel: "10kV",
  locationDesc: null,
  healthStatus: "NORMAL",
  healthStatusText: "正常",
  ownerTeamId: null,
  faultCount: 0,
  openFaultCount: 0,
  ...overrides,
});

export const createGridAssetResponse = createDefaultGridAsset;
