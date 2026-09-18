import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/database";
import type { AuthUser } from "../types/express";

export interface AuditEntry {
  actor?: AuthUser | null;
  action: string;
  targetType?: string;
  targetId?: string | number | null;
  detail?: string;
  result?: "SUCCESS" | "FAILED";
  requestId?: string;
  conn?: PoolConnection;
}

/** 审计日志必须能加入业务事务，因此可选传入同一连接。 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  const conn = entry.conn ?? pool;
  await conn.query(
    `INSERT INTO audit_log (actor_id, actor_name, actor_role, action, target_type, target_id, detail, result, request_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.actor?.id ?? null,
      entry.actor?.displayName ?? null,
      entry.actor?.role ?? null,
      entry.action,
      entry.targetType ?? null,
      entry.targetId == null ? null : String(entry.targetId),
      entry.detail ?? null,
      entry.result ?? "SUCCESS",
      entry.requestId ?? null,
    ],
  );
}
