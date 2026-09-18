import { pool } from "../config/database";
import type { GridAsset } from "../models/GridAsset";
import { queryAll, queryOne, execute } from "./db";

export interface AssetWithFaultCount extends GridAsset {
  fault_count: number;
  open_fault_count: number;
}

export const gridAssetRepository = {
  async findAll(feederLine?: string, healthStatus?: string): Promise<AssetWithFaultCount[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (feederLine) { where.push("a.feeder_line = ?"); params.push(feederLine); }
    if (healthStatus) { where.push("a.health_status = ?"); params.push(healthStatus); }
    return queryAll<AssetWithFaultCount>(
      pool,
      `SELECT a.*,
              COUNT(f.id) AS fault_count,
              SUM(CASE WHEN f.status IN ('WAIT_DISPATCH','TICKET_CREATED') THEN 1 ELSE 0 END) AS open_fault_count
         FROM grid_asset a
         LEFT JOIN fault_report f ON f.asset_id = a.id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        GROUP BY a.id
        ORDER BY a.id`,
      params,
    );
  },

  async findById(id: number): Promise<AssetWithFaultCount | null> {
    return queryOne<AssetWithFaultCount>(
      pool,
      `SELECT a.*,
              COUNT(f.id) AS fault_count,
              SUM(CASE WHEN f.status IN ('WAIT_DISPATCH','TICKET_CREATED') THEN 1 ELSE 0 END) AS open_fault_count
         FROM grid_asset a
         LEFT JOIN fault_report f ON f.asset_id = a.id
        WHERE a.id = ?
        GROUP BY a.id`,
      [id],
    );
  },

  async listFeederLines(): Promise<string[]> {
    const rows = await queryAll<{ feeder_line: string }>(pool, "SELECT DISTINCT feeder_line FROM grid_asset ORDER BY feeder_line");
    return rows.map((r) => r.feeder_line);
  },

  async create(data: Omit<GridAsset, "id">): Promise<number> {
    const result = await execute(
      pool,
      `INSERT INTO grid_asset (asset_code, asset_type, feeder_line, voltage_level, location_desc, health_status, owner_team_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.asset_code,
        data.asset_type,
        data.feeder_line,
        data.voltage_level,
        data.location_desc,
        data.health_status,
        data.owner_team_id,
      ],
    );
    return result.insertId;
  },

  async updateHealthStatus(id: number, healthStatus: string): Promise<number> {
    const result = await execute(pool, "UPDATE grid_asset SET health_status = ? WHERE id = ?", [healthStatus, id]);
    return result.affectedRows;
  },
};
