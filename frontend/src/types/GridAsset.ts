import type { AssetHealthStatus } from "../constants/AssetHealthStatus";

export interface GridAsset {
  id: number;
  assetCode: string;
  assetType: string;
  feederLine: string;
  voltageLevel: string;
  locationDesc: string | null;
  healthStatus: AssetHealthStatus | string;
  healthStatusText: string;
  ownerTeamId: number | null;
  faultCount: number;
  openFaultCount: number;
}
