import type { PoolConnection, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/database";

type Queryable = PoolConnection | typeof pool;

export async function withTransaction<T>(work: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function queryAll<T>(
  conn: Queryable,
  sql: string,
  params: unknown[] | Record<string, unknown> = [],
): Promise<T[]> {
  const [rows] = await conn.query(sql, params as any);
  return rows as T[];
}

export async function queryOne<T>(
  conn: Queryable,
  sql: string,
  params: unknown[] | Record<string, unknown> = [],
): Promise<T | null> {
  const rows = await queryAll<T>(conn, sql, params);
  return rows[0] ?? null;
}

export async function execute(
  conn: Queryable,
  sql: string,
  params: unknown[] | Record<string, unknown> = [],
): Promise<ResultSetHeader> {
  const [result] = await conn.query(sql, params as any);
  return result as ResultSetHeader;
}

export async function insertAndGetId(conn: Queryable, sql: string, params: unknown[] | Record<string, unknown>): Promise<number> {
  const result = await execute(conn, sql, params);
  return result.insertId;
}
