import { get, post } from "./http";
import type { InventoryTransaction, SparePart, SparePartUsage } from "../types/SparePartUsage";

export const listParts = () => get<SparePart[]>("/spare-part-usage/parts");
export const listUsages = (ticketId?: number) =>
  get<SparePartUsage[]>(ticketId !== undefined ? `/spare-part-usage/usages?ticketId=${ticketId}` : "/spare-part-usage/usages");
export const listInventoryTransactions = (partCode?: string) =>
  get<InventoryTransaction[]>(
    partCode ? `/spare-part-usage/inventory-transactions?partCode=${encodeURIComponent(partCode)}` : "/spare-part-usage/inventory-transactions"
  );

/** 仓管审批/驳回（重复审批后端只有一次成功） */
export const reviewUsage = (id: number, decision: "APPROVED" | "REJECTED", remark?: string) =>
  post<SparePartUsage>(`/spare-part-usage/usages/${id}/review`, { decision, remark });
