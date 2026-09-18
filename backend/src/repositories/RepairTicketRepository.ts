import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/database";
import type { RepairTicket } from "../models/RepairTicket";
import { queryAll, queryOne, execute, insertAndGetId } from "./db";

export interface TicketWithRelations extends RepairTicket {
  fault_type: string;
  severity: string;
  reporter_name: string;
  team_name: string | null;
  dispatcher_name: string | null;
}

const DETAIL_SELECT = `
  SELECT t.*, f.fault_type, f.severity, f.reporter_name,
         c.name AS team_name, u.display_name AS dispatcher_name
  FROM repair_ticket t
  JOIN fault_report f ON f.id = t.fault_report_id
  LEFT JOIN crew c ON c.id = t.team_id
  LEFT JOIN sys_user u ON u.id = t.dispatcher_id
`;

export const repairTicketRepository = {
  async findAll(status?: string): Promise<TicketWithRelations[]> {
    if (status) {
      return queryAll<TicketWithRelations>(pool, `${DETAIL_SELECT} WHERE t.status = ? ORDER BY t.priority, t.id`, [status]);
    }
    return queryAll<TicketWithRelations>(pool, `${DETAIL_SELECT} ORDER BY FIELD(t.status,'WAIT_DISPATCH','ASSIGNED','ARRIVED','REPAIRING','RESTORED','CLOSED'), t.id`);
  },

  async findById(id: number): Promise<TicketWithRelations | null> {
    return queryOne<TicketWithRelations>(pool, `${DETAIL_SELECT} WHERE t.id = ?`, [id]);
  },

  /** 事务内锁定工单行。 */
  async lockById(conn: PoolConnection, id: number): Promise<TicketWithRelations | null> {
    return queryOne<TicketWithRelations>(conn, `${DETAIL_SELECT} WHERE t.id = ? FOR UPDATE`, [id]);
  },

  /**
   * 派工原子落库：仅 WAIT_DISPATCH 工单可被派工。
   * 依赖 status 条件 + 行锁保证并发派工只有一个请求 affectedRows=1。
   */
  async markAssigned(
    conn: PoolConnection,
    ticketId: number,
    teamId: number,
    dispatcherId: number,
    priority: string,
  ): Promise<number> {
    const result = await execute(
      conn,
      `UPDATE repair_ticket
          SET team_id = :teamId, dispatcher_id = :dispatcherId, priority = :priority,
              status = 'ASSIGNED', assigned_at = NOW(3), version = version + 1
        WHERE id = :ticketId AND status = 'WAIT_DISPATCH'`,
      { ticketId, teamId, dispatcherId, priority },
    );
    return result.affectedRows;
  },

  /**
   * 状态推进：同时校验“当前状态 = fromStatus”。
   * 重复点击/并发推进时只有一次 affectedRows=1，第二次拿到 0 即冲突。
   * expectedVersion 存在时再加乐观锁，双保险。
   */
  async advanceStatus(
    conn: PoolConnection,
    ticketId: number,
    fromStatus: string,
    toStatus: string,
    timestampColumn: "arrived_at" | "repair_started_at" | "restored_at" | "closed_at",
    expectedVersion?: number,
  ): Promise<number> {
    const versionClause = expectedVersion == null ? "" : "AND version = :expectedVersion";
    const result = await execute(
      conn,
      `UPDATE repair_ticket
          SET status = :toStatus, ${timestampColumn} = NOW(3), version = version + 1
        WHERE id = :ticketId AND status = :fromStatus ${versionClause}`,
      { ticketId, fromStatus, toStatus, expectedVersion },
    );
    return result.affectedRows;
  },

  async create(conn: PoolConnection, faultReportId: number, priority: string): Promise<number> {
    return insertAndGetId(
      conn,
      "INSERT INTO repair_ticket (fault_report_id, priority, status) VALUES (?, ?, 'WAIT_DISPATCH')",
      [faultReportId, priority],
    );
  },
};
