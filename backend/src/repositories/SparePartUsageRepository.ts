import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/database";
import type { SparePartUsage } from "../models/SparePartUsage";
import { queryAll, queryOne, execute } from "./db";

export interface UsageView extends SparePartUsage {
  ticket_status: string;
  part_stock: number;
}

export const sparePartUsageRepository = {
  async findAll(status?: string, ticketId?: number): Promise<UsageView[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (status) { where.push("u.usage_status = ?"); params.push(status); }
    if (ticketId) { where.push("u.ticket_id = ?"); params.push(ticketId); }
    return queryAll<UsageView>(
      pool,
      `SELECT u.*, t.status AS ticket_status, p.stock AS part_stock
         FROM spare_part_usage u
         JOIN repair_ticket t ON t.id = u.ticket_id
         JOIN spare_part p ON p.part_code = u.part_code
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY u.id DESC`,
      params,
    );
  },

  async lockById(conn: PoolConnection, id: number): Promise<SparePartUsage | null> {
    return queryOne<SparePartUsage>(conn, "SELECT * FROM spare_part_usage WHERE id = ? FOR UPDATE", [id]);
  },

  async create(
    conn: PoolConnection,
    data: { ticket_id: number; part_code: string; part_name: string; quantity: number; warehouse_name: string; requested_by: number | null },
  ): Promise<number> {
    const result = await execute(
      conn,
      `INSERT INTO spare_part_usage
        (ticket_id, part_code, part_name, quantity, warehouse_name, usage_status, requested_by)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
      [data.ticket_id, data.part_code, data.part_name, data.quantity, data.warehouse_name, data.requested_by],
    );
    return result.insertId;
  },

  /**
   * 审批通过：条件更新保证同一申请只有一次审批成功。
   * 行锁 + usage_status='PENDING' 双保险，重复审批第二次 affectedRows=0。
   */
  async markApproved(conn: PoolConnection, usageId: number, approverId: number): Promise<number> {
    const result = await execute(
      conn,
      `UPDATE spare_part_usage
          SET usage_status = 'APPROVED', approved_by = :approverId, approved_at = NOW(3), version = version + 1
        WHERE id = :usageId AND usage_status = 'PENDING'`,
      { usageId, approverId },
    );
    return result.affectedRows;
  },

  async markRejected(conn: PoolConnection, usageId: number, rejecterId: number): Promise<number> {
    const result = await execute(
      conn,
      `UPDATE spare_part_usage
          SET usage_status = 'REJECTED', rejected_by = :rejecterId, version = version + 1
        WHERE id = :usageId AND usage_status = 'PENDING'`,
      { usageId, rejecterId },
    );
    return result.affectedRows;
  },

  async updateStatus(conn: PoolConnection, usageId: number, status: string): Promise<void> {
    await execute(conn, "UPDATE spare_part_usage SET usage_status = ? WHERE id = ?", [status, usageId]);
  },
};
