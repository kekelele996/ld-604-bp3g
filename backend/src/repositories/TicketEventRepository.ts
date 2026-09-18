import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/database";
import type { TicketEvent } from "../models/TicketEvent";
import { queryAll, execute } from "./db";

export const ticketEventRepository = {
  async findByTicketId(ticketId: number): Promise<TicketEvent[]> {
    return queryAll<TicketEvent>(pool, "SELECT * FROM ticket_event WHERE ticket_id = ? ORDER BY id", [ticketId]);
  },

  async append(
    conn: PoolConnection,
    data: { ticket_id: number; from_status: string | null; to_status: string; actor_id?: number | null; actor_name?: string | null; note?: string | null },
  ): Promise<void> {
    await execute(
      conn,
      `INSERT INTO ticket_event (ticket_id, from_status, to_status, actor_id, actor_name, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.ticket_id, data.from_status, data.to_status, data.actor_id ?? null, data.actor_name ?? null, data.note ?? null],
    );
  },
};
