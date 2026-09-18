import { get } from "./http";
import type { GridAsset } from "../types/GridAsset";

export const listGridAsset = () => get<GridAsset[]>("/grid-asset");
export const getGridAsset = (id: number) => get<GridAsset>(`/grid-asset/${id}`);
