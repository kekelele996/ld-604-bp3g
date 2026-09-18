import type { GridAssetRow } from "../database/types";

export type GridAssetDto = GridAssetRow;

export function createGridAssetDto(row: GridAssetRow): GridAssetDto {
  return { ...row };
}

export const createGridAssetListDto = (rows: GridAssetRow[]): GridAssetDto[] => rows.map(createGridAssetDto);
