import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/database";
import type { FaultReport } from "../models/FaultReport";
import { queryAll, queryOne, execute } from "./db";

export interface FaultReportView extends FaultReport {
  asset_code: string | null;
  asset_type: string | null;
}

const SELECT_SQL = `
  SELECT f.*, a.asset_code, a.asset_type
  FROM fault_report f
  LEFT JOIN grid_asset a ON a.id = f.asset_id
`;

export const faultReportRepository = {
  async findAll(status?: string, severity?: string): Promise<FaultReportView[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (status) { where.push("f.status = ?"); params.push(status); }
    if (severity) { where.push("f.severity = ?"); params.push(severity); }
    const sql = `${SELECT_SQL} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY f.id DESC`;
    return queryAll<FaultReportView>(pool, sql, params);
  },

  async findById(id: number): Promise<FaultReportView | null> {
    return queryOne<FaultReportView>(pool, `${SELECT_SQL} WHERE f.id = ?`, [id]);
  },

  async lockById(conn: PoolConnection, id: number): Promise<FaultReport | null> {
    return queryOne<FaultReport>(conn, "SELECT * FROM fault_report WHERE id = ? FOR UPDATE", [id]);
  },

  async create(
    conn: PoolConnection,
    data: Pick<FaultReport, "reporter_name" | "phone" | "fault_type" | "severity" | "report_channel"> & {
      asset_id?: number | null;
      address_desc?: string | null;
    },
  ): Promise<number> {
    const result = await execute(
      conn,
      `INSERT INTO fault_report
        (reporter_name, phone, asset_id, fault_type, address_desc, severity, report_channel, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'WAIT_DISPATCH')`,
      [
        data.reporter_name,
        data.phone,
        data.asset_id ?? null,
        data.fault_type,
        data.address_desc ?? null,
        data.severity,
        data.report_channel,
      ],
    );
    return result.insertId;
  },

  async markTicketCreated(conn: PoolConnection, faultId: number, ticketId: number): Promise<void> {
    await execute(conn, "UPDATE fault_report SET status = 'TICKET_CREATED', ticket_id = ? WHERE id = ?", [ticketId, faultId]);
  },

  async markDuplicated(conn: PoolConnection, faultId: number, mergedIntoId: number): Promise<void> {
    await execute(conn, "UPDATE fault_report SET status = 'DUPLICATED', merged_into_id = ? WHERE id = ?", [mergedIntoId, faultId]);
  },
};
