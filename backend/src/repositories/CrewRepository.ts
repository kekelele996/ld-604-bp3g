import type { PoolConnection } from "mysql2/promise";
import { pool } from "../config/database";
import type { Crew, CrewAvailabilityView } from "../models/Crew";
import { parseSkillTags } from "../utils/formatters";
import { queryAll, queryOne, execute } from "./db";

/**
 * 班组接单资格（SQL 行锁内判定）：
 *  1) duty_status = 'ON_DUTY'                        —— 值班
 *  2) current_ticket_id IS NULL                      —— 空闲
 *  3) FIND_IN_SET(:faultType, skill_tags)            —— 技能匹配故障类型
 */
const LOCK_SELECT = `
  SELECT c.*,
    (c.duty_status = 'ON_DUTY' AND c.current_ticket_id IS NULL) AS is_idle,
    (c.duty_status = 'ON_DUTY') AS is_on_duty,
    FIND_IN_SET(:faultType, REPLACE(c.skill_tags, ' ', '')) > 0 AS skill_match
  FROM crew c
`;

export interface CrewLockResult {
  crew: Crew;
  isOnDuty: number;
  isIdle: number;
  skillMatch: number;
}

export const crewRepository = {
  async findAll(): Promise<Crew[]> {
    return queryAll<Crew>(pool, "SELECT * FROM crew ORDER BY id");
  },

  /** 派工面板：列出班组可接单情况；传入故障类型时同时做技能判定。 */
  async listAvailability(faultType?: string): Promise<CrewAvailabilityView[]> {
    const rows = await queryAll<Crew>(pool, "SELECT * FROM crew ORDER BY duty_status DESC, id");
    return rows.map((row) => {
      const skill_list = parseSkillTags(row.skill_tags);
      const onDuty = row.duty_status === "ON_DUTY";
      const idle = row.current_ticket_id == null;
      const skillOk = !faultType || skill_list.includes(faultType);
      let busy_reason: string | null = null;
      if (!onDuty) busy_reason = "班组休班";
      else if (!idle) busy_reason = `在做工单 #${row.current_ticket_id}`;
      else if (!skillOk) busy_reason = `缺少技能 ${faultType}`;
      return { ...row, skill_list, available: onDuty && idle && skillOk, busy_reason };
    });
  },

  async findById(id: number): Promise<Crew | null> {
    return queryOne<Crew>(pool, "SELECT * FROM crew WHERE id = ?", [id]);
  },

  /** 派工事务内调用：SELECT ... FOR UPDATE 锁定班组行并返回接单资格。 */
  async lockForDispatch(conn: PoolConnection, id: number, faultType: string): Promise<CrewLockResult | null> {
    const [rows] = await conn.query(LOCK_SELECT + " WHERE c.id = :id FOR UPDATE", { id, faultType });
    const row = (rows as Array<Record<string, unknown>>)[0];
    if (!row) return null;
    return {
      crew: row as unknown as Crew,
      isOnDuty: Number(row.is_on_duty),
      isIdle: Number(row.is_idle),
      skillMatch: Number(row.skill_match),
    };
  },

  /** 条件占用：仅在值班且空闲时成功，affectedRows=0 即并发冲突。 */
  async occupyIfIdle(conn: PoolConnection, crewId: number, ticketId: number): Promise<number> {
    const result = await execute(
      conn,
      `UPDATE crew SET current_ticket_id = ?, updated_at = NOW()
       WHERE id = ? AND duty_status = 'ON_DUTY' AND current_ticket_id IS NULL`,
      [ticketId, crewId],
    );
    return result.affectedRows;
  },

  async release(conn: PoolConnection, crewId: number): Promise<void> {
    await execute(conn, "UPDATE crew SET current_ticket_id = NULL, updated_at = NOW() WHERE id = ?", [crewId]);
  },

  async setDutyStatus(id: number, dutyStatus: "ON_DUTY" | "OFF_DUTY"): Promise<void> {
    await execute(pool, "UPDATE crew SET duty_status = ?, updated_at = NOW() WHERE id = ?", [dutyStatus, id]);
  },

  async create(data: {
    name: string;
    leader_id?: number | null;
    skill_tags: string;
    duty_status: "ON_DUTY" | "OFF_DUTY";
    contact_phone?: string | null;
  }): Promise<number> {
    return (await execute(
      pool,
      `INSERT INTO crew (name, leader_id, skill_tags, duty_status, contact_phone)
       VALUES (?, ?, ?, ?, ?)`,
      [data.name, data.leader_id ?? null, data.skill_tags, data.duty_status, data.contact_phone ?? null],
    )).insertId;
  },
};
