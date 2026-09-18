import { get, post } from "./http";
import type { SparePartUsage, SparePart, InventoryTransaction } from "../types/SparePartUsage";

export function listSparePartUsage(params: { status?: string; ticketId?: number } = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "") as [string, string][],
  ).toString();
  return get<SparePartUsage[]>(`/spare-part-usage${qs ? `?${qs}` : ""}`);
}

export function listSparePartCatalog() {
  return get<SparePart[]>("/spare-part-usage/catalog/list");
}

export function listInventoryTransactions(partCode?: string) {
  return get<InventoryTransaction[]>(
    `/spare-part-usage/inventory/transactions${partCode ? `?partCode=${encodeURIComponent(partCode)}` : ""}`,
  );
}

export function approvePartUsage(usageId: number) {
  return post<{ usageId: number; approved: boolean; balanceAfter: number }>(`/spare-part-usage/${usageId}/approve`, {});
}

export function rejectPartUsage(usageId: number, reason: string) {
  return post<{ usageId: number; approved: boolean }>(`/spare-part-usage/${usageId}/reject`, { reason });
}

export function returnPartUsage(usageId: number, quantity?: number) {
  return post<{ usageId: number; returned: boolean }>(`/spare-part-usage/${usageId}/return`, { quantity });
}
