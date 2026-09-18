import type { SparePartUsageRow, SparePartRow, InventoryTransactionRow } from "../database/types";

/** 备件领用记录领域模型 */
export type SparePartUsage = SparePartUsageRow;
/** 备件库存领域模型 */
export type SparePart = SparePartRow;
/** 库存流水领域模型 */
export type InventoryTransaction = InventoryTransactionRow;
