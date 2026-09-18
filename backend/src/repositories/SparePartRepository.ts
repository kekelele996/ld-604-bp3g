import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/database";
import type { SparePart } from "../models/SparePart";
import { queryAll, queryOne, execute } from "./db";

export const sparePartRepository = {
  async findAll(): Promise<SparePart[]> {
    return queryAll<SparePart>(pool, "SELECT * FROM spare_part ORDER BY id");
  },

  async findByCode(conn: PoolConnection, partCode: string): Promise<SparePart | null> {
    return queryOne<SparePart>(conn, "SELECT * FROM spare_part WHERE part_code = ? FOR UPDATE", [partCode]);
  },

  async findByCodeUnlocked(partCode: string): Promise<SparePart | null> {
    return queryOne<SparePart>(pool, "SELECT * FROM spare_part WHERE part_code = ?", [partCode]);
  },

  async create(data: Omit<SparePart, "id" | "updated_at">): Promise<number> {
    const result = await execute(
      pool,
      "INSERT INTO spare_part (part_code, part_name, warehouse_name, stock, safety_stock) VALUES (?, ?, ?, ?, ?)",
      [data.part_code, data.part_name, data.warehouse_name, data.stock, data.safety_stock],
    );
    return result.insertId;
  },

  /**
   * 条件扣减库存：只有结存足够时才出 affectedRows=1。
   * 库存不足时不更新任何行，业务事务随后整体回滚。
   */
  async decrementIfEnough(conn: PoolConnection, partCode: string, quantity: number): Promise<{ affectedRows: number; balance: number | null }> {
    const result = await execute(
      conn,
      `UPDATE spare_part
          SET stock = stock - :quantity, updated_at = NOW()
        WHERE part_code = :partCode AND stock >= :quantity`,
      { partCode, quantity },
    );
    if (result.affectedRows === 0) return { affectedRows: 0, balance: null };
    const latest = await queryOne<{ stock: number }>(conn, "SELECT stock FROM spare_part WHERE part_code = ?", [partCode]);
    return { affectedRows: result.affectedRows, balance: latest?.stock ?? null };
  },

  async increment(conn: PoolConnection, partCode: string, quantity: number): Promise<number> {
    await execute(
      conn,
      "UPDATE spare_part SET stock = stock + ?, updated_at = NOW() WHERE part_code = ?",
      [quantity, partCode],
    );
    const latest = await queryOne<{ stock: number }>(conn, "SELECT stock FROM spare_part WHERE part_code = ?", [partCode]);
    return latest?.stock ?? 0;
  },
};
