import type { AssetWithFaultCount } from "../repositories/GridAssetRepository";
import { ASSET_HEALTH_TEXT } from "../constants/statusText";

export function toGridAssetDto(row: AssetWithFaultCount) {
  return {
    id: row.id,
    assetCode: row.asset_code,
    assetType: row.asset_type,
    feederLine: row.feeder_line,
    voltageLevel: row.voltage_level,
    locationDesc: row.location_desc,
    healthStatus: row.health_status,
    healthStatusText: ASSET_HEALTH_TEXT[row.health_status as keyof typeof ASSET_HEALTH_TEXT] ?? row.health_status,
    ownerTeamId: row.owner_team_id,
    faultCount: Number(row.fault_count ?? 0),
    openFaultCount: Number(row.open_fault_count ?? 0),
  };
}

export function toGridAssetListDto(rows: AssetWithFaultCount[]) {
  return rows.map(toGridAssetDto);
}
