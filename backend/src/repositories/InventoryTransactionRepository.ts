import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/database";
import type { InventoryTransaction } from "../models/InventoryTransaction";
import { queryAll, execute } from "./db";

export const inventoryTransactionRepository = {
  async findAll(partCode?: string): Promise<InventoryTransaction[]> {
    if (partCode) {
      return queryAll<InventoryTransaction>(pool, "SELECT * FROM inventory_transaction WHERE part_code = ? ORDER BY id", [partCode]);
    }
    return queryAll<InventoryTransaction>(pool, "SELECT * FROM inventory_transaction ORDER BY id");
  },

  /** 流水必须与库存扣减写在同一事务里。 */
  async append(
    conn: PoolConnection,
    data: {
      part_code: string;
      change_qty: number;
      balance_after: number;
      tx_type: "OUTBOUND" | "RETURN" | "ADJUST";
      usage_id?: number | null;
      ticket_id?: number | null;
      operator_id?: number | null;
      remark?: string | null;
    },
  ): Promise<number> {
    const result = await execute(
      conn,
      `INSERT INTO inventory_transaction
        (part_code, change_qty, balance_after, tx_type, usage_id, ticket_id, operator_id, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.part_code,
        data.change_qty,
        data.balance_after,
        data.tx_type,
        data.usage_id ?? null,
        data.ticket_id ?? null,
        data.operator_id ?? null,
        data.remark ?? null,
      ],
    );
    return result.insertId;
  },
};
