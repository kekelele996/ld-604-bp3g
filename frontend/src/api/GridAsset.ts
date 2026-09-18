import { get, post, patch } from "./http";
import type { GridAsset } from "../types/GridAsset";

export function listGridAsset(params: { feederLine?: string; healthStatus?: string } = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();
  return get<GridAsset[]>(`/grid-asset${qs ? `?${qs}` : ""}`);
}

export function listFeederLines() {
  return get<string[]>("/grid-asset/feeder-lines");
}

export function createGridAsset(payload: Record<string, unknown>) {
  return post<GridAsset>("/grid-asset", payload);
}

export function updateAssetHealth(id: number, health_status: string) {
  return patch<GridAsset>(`/grid-asset/${id}/health`, { health_status });
}
