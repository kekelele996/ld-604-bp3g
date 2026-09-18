/**
 * 本地种子数据镜像（仅用于文档/类型示例）。
 * 真正运行时全部来自本地数据库（后端 /api），禁止接入第三方 API。
 * 与 backend/src/seed.ts 保持同一批业务取值。
 */
import type { GridAsset } from "../types/GridAsset";
import type { FaultReport } from "../types/FaultReport";
import type { RepairTicket } from "../types/RepairTicket";
import type { Crew } from "../types/Crew";

export const mockData = {
  gridAsset: [
    {
      id: 1,
      asset_code: "FB-10kV-001",
      asset_type: "FEEDER",
      feeder_line: "10kV 东风线",
      voltage_level: "10kV",
      location_desc: "东风路 12 号环网柜",
      health_status: "DEGRADED",
      owner_team_id: 1
    },
    {
      id: 2,
      asset_code: "CB-04kV-018",
      asset_type: "CABLE_BRANCH_BOX",
      feeder_line: "10kV 滨河线",
      voltage_level: "10kV",
      location_desc: "滨河小区 3 栋电缆分支箱",
      health_status: "DANGEROUS",
      owner_team_id: 2
    }
  ] as GridAsset[],
  faultReport: [
    {
      id: 1,
      reporter_name: "王建国",
      phone: "13800000001",
      asset_id: 2,
      fault_type: "OUTAGE",
      address_desc: "滨河小区大面积停电",
      severity: "CRITICAL",
      report_channel: "HOTLINE",
      status: "CONVERTED"
    }
  ] as FaultReport[],
  repairTicket: [
    {
      id: 1,
      fault_report_id: 1,
      team_id: null,
      dispatcher_id: null,
      priority: "CRITICAL",
      status: "WAIT_DISPATCH",
      assigned_at: null,
      arrived_at: null,
      repairing_at: null,
      restored_at: null,
      closed_at: null
    }
  ] as RepairTicket[],
  crew: [
    {
      id: 1,
      name: "带电作业一班",
      leader_id: 101,
      skill_tags: ["HOT_LINE", "CABLE"],
      duty_status: "ON_DUTY",
      current_ticket_id: null,
      contact_phone: "0571-88001001",
      available: true
    }
  ] as Crew[]
} as const;
