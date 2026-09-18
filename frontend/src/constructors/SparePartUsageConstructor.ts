import type { SparePartUsage } from "../types/SparePartUsage";

export const createDefaultSparePartUsage = (overrides: Partial<SparePartUsage> = {}): SparePartUsage => ({
  id: 0,
  ticket_id: 0,
  part_code: "",
  part_name: "",
  quantity: 1,
  warehouse_name: "",
  usage_status: "PENDING",
  approved_by: null,
  approved_at: null,
  created_at: "",
  ...overrides
});

export const createSparePartUsageForm = (ticketId: number, partCode: string, quantity: number): SparePartUsage =>
  createDefaultSparePartUsage({ ticket_id: ticketId, part_code: partCode, quantity });

export const createSparePartUsageResponse = (row: Partial<SparePartUsage>): SparePartUsage =>
  createDefaultSparePartUsage(row);
