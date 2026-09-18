import { pool } from "../config/database";
import { queryAll } from "../repositories/db";

interface StatusCountRow {
  status: string;
  cnt: number;
}

/**
 * 抢修态势：所有统计均实时来自数据库。
 * 重启后页面数据与工单状态、班组占用、库存流水完全一致（无内存态）。
 */
export const dashboardService = {
  async overview() {
    const ticketRows = await queryAll<StatusCountRow>(
      pool,
      "SELECT status, COUNT(*) AS cnt FROM repair_ticket GROUP BY status",
    );
    const ticketByStatus = Object.fromEntries(ticketRows.map((r) => [r.status, Number(r.cnt)]));

    const [[crewStat], [faultStat], [restoreStat]] = await Promise.all([
      queryAll<{ on_duty: number; idle: number }>(
        pool,
        `SELECT
           SUM(duty_status = 'ON_DUTY') AS on_duty,
           SUM(duty_status = 'ON_DUTY' AND current_ticket_id IS NULL) AS idle
         FROM crew`,
      ),
      queryAll<{ pending: number; open: number }>(
        pool,
        `SELECT
           SUM(status = 'WAIT_DISPATCH') AS pending,
           SUM(status IN ('WAIT_DISPATCH','TICKET_CREATED')) AS open
         FROM fault_report`,
      ),
      queryAll<{ avg_minutes: number | null }>(
        pool,
        `SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, assigned_at, restored_at))) AS avg_minutes
           FROM repair_ticket
          WHERE assigned_at IS NOT NULL AND restored_at IS NOT NULL`,
      ),
    ]);

    const lowStock = await queryAll<{ part_code: string; part_name: string; stock: number; safety_stock: number }>(
      pool,
      "SELECT part_code, part_name, stock, safety_stock FROM spare_part WHERE stock <= safety_stock ORDER BY stock",
    );

    const pendingApprovals = await queryAll<{ cnt: number }>(
      pool,
      "SELECT COUNT(*) AS cnt FROM spare_part_usage WHERE usage_status = 'PENDING'",
    );

    return {
      ticketByStatus,
      crew: {
        onDuty: Number(crewStat?.on_duty ?? 0),
        idle: Number(crewStat?.idle ?? 0),
      },
      faults: {
        pendingDispatch: Number(faultStat?.pending ?? 0),
        open: Number(faultStat?.open ?? 0),
      },
      averageRestoreMinutes: restoreStat?.avg_minutes != null ? Number(restoreStat.avg_minutes) : null,
      lowStockParts: lowStock,
      pendingPartApprovals: Number(pendingApprovals[0]?.cnt ?? 0),
    };
  },
};
