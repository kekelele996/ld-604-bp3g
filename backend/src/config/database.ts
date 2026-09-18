import type { Pool, PoolOptions } from "mysql2/promise";
import { createPool } from "mysql2/promise";
import { config } from "./env";

const options: PoolOptions = {
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  dateStrings: true,
  charset: "utf8mb4_general_ci",
};

export const pool: Pool = createPool(options);

export async function waitForDatabase(retries = 30, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      console.info(`[db] connected after ${attempt} attempt(s)`);
      return;
    } catch (err) {
      console.warn(`[db] not ready (attempt ${attempt}/${retries}): ${(err as Error).message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
