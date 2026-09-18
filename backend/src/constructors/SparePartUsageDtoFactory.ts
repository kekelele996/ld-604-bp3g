import type { InventoryTransactionRow, SparePartRow, SparePartUsageRow } from "../database/types";

const toIso = (value: Date | string | null): string | null => (value instanceof Date ? value.toISOString() : value);

export interface SparePartDto {
  id: number;
  part_code: string;
  part_name: string;
  warehouse_name: string;
  stock_quantity: number;
}

export interface SparePartUsageDto {
  id: number;
  ticket_id: number;
  part_code: string;
  part_name: string;
  quantity: number;
  warehouse_name: string;
  usage_status: string;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
}

export interface InventoryTransactionDto {
  id: number;
  part_code: string;
  change_type: string;
  quantity: number;
  balance_after: number;
  ticket_id: number | null;
  usage_id: number | null;
  operator_id: number | null;
  remark: string | null;
  created_at: string;
}

export function createSparePartDto(row: SparePartRow): SparePartDto {
  return { ...row };
}

export function createSparePartUsageDto(row: SparePartUsageRow): SparePartUsageDto {
  return {
    id: row.id,
    ticket_id: row.ticket_id,
    part_code: row.part_code,
    part_name: row.part_name,
    quantity: row.quantity,
    warehouse_name: row.warehouse_name,
    usage_status: row.usage_status,
    approved_by: row.approved_by,
    approved_at: toIso(row.approved_at),
    created_at: toIso(row.created_at) as string
  };
}

export function createInventoryTransactionDto(row: InventoryTransactionRow): InventoryTransactionDto {
  return {
    id: row.id,
    part_code: row.part_code,
    change_type: row.change_type,
    quantity: row.quantity,
    balance_after: row.balance_after,
    ticket_id: row.ticket_id,
    usage_id: row.usage_id,
    operator_id: row.operator_id,
    remark: row.remark,
    created_at: toIso(row.created_at) as string
  };
}

export const createSparePartListDto = (rows: SparePartRow[]): SparePartDto[] => rows.map(createSparePartDto);
export const createSparePartUsageListDto = (rows: SparePartUsageRow[]): SparePartUsageDto[] => rows.map(createSparePartUsageDto);
export const createInventoryTransactionListDto = (rows: InventoryTransactionRow[]): InventoryTransactionDto[] =>
  rows.map(createInventoryTransactionDto);
