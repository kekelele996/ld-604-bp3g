import { getDataGateway } from "./database/gatewayFactory";
import type { DataGateway } from "./database/DataGateway";
import type {
  CrewRow,
  FaultReportRow,
  GridAssetRow,
  SparePartRow
} from "./database/types";

/**
 * 本地种子数据：全部写本地数据库（或内存网关），禁止第三方 API。
 * 幂等：已有数据时跳过。
 */

const SEED_ASSETS: Omit<GridAssetRow, "id">[] = [
  {
    asset_code: "FB-10kV-001",
    asset_type: "FEEDER",
    feeder_line: "10kV 东风线",
    voltage_level: "10kV",
    location_desc: "东风路 12 号环网柜",
    health_status: "DEGRADED",
    owner_team_id: 1
  },
  {
    asset_code: "CB-04kV-018",
    asset_type: "CABLE_BRANCH_BOX",
    feeder_line: "10kV 滨河线",
    voltage_level: "10kV",
    location_desc: "滨河小区 3 栋电缆分支箱",
    health_status: "DANGEROUS",
    owner_team_id: 2
  },
  {
    asset_code: "TR-10kV-007",
    asset_type: "TRANSFORMER",
    feeder_line: "10kV 青山线",
    voltage_level: "10kV/0.4kV",
    location_desc: "青山村 2 号台变",
    health_status: "WATCH",
    owner_team_id: 1
  }
];

const SEED_FAULTS: Omit<FaultReportRow, "id">[] = [
  {
    reporter_name: "王建国",
    phone: "13800000001",
    asset_id: 2,
    fault_type: "OUTAGE",
    address_desc: "滨河小区大面积停电",
    severity: "CRITICAL",
    report_channel: "HOTLINE",
    status: "RECEIVED"
  },
  {
    reporter_name: "李秀兰",
    phone: "13800000002",
    asset_id: 1,
    fault_type: "TRIP",
    address_desc: "东风路频繁跳闸",
    severity: "MAJOR",
    report_channel: "APP",
    status: "RECEIVED"
  },
  {
    reporter_name: "赵卫东",
    phone: "13800000003",
    asset_id: 3,
    fault_type: "VOLTAGE_LOW",
    address_desc: "青山村末端电压偏低",
    severity: "MINOR",
    report_channel: "GRID_INSPECT",
    status: "RECEIVED"
  }
];

const SEED_CREWS: Omit<CrewRow, "id">[] = [
  {
    name: "带电作业一班",
    leader_id: 101,
    skill_tags: "HOT_LINE,CABLE,OVERHEAD",
    duty_status: "ON_DUTY",
    current_ticket_id: null,
    contact_phone: "0571-88001001"
  },
  {
    name: "电缆检修二班",
    leader_id: 102,
    skill_tags: "CABLE,TRANSFORMER",
    duty_status: "ON_DUTY",
    current_ticket_id: null,
    contact_phone: "0571-88001002"
  },
  {
    name: "架空线路三班",
    leader_id: 103,
    skill_tags: "OVERHEAD",
    duty_status: "OFF_DUTY",
    current_ticket_id: null,
    contact_phone: "0571-88001003"
  }
];

const SEED_PARTS: Omit<SparePartRow, "id">[] = [
  { part_code: "SP-CABLE-10", part_name: "10kV 电缆中间接头", warehouse_name: "中心仓库", stock_quantity: 8 },
  { part_code: "SP-FUSE-10", part_name: "10kV 跌落式熔断器", warehouse_name: "中心仓库", stock_quantity: 20 },
  { part_code: "SP-SEP-10", part_name: "10kV 柱上隔离开关", warehouse_name: "东郊仓库", stock_quantity: 5 },
  { part_code: "SP-LT-04", part_name: "0.4kV 低压电缆", warehouse_name: "东郊仓库", stock_quantity: 3 }
];

/**
 * 幂等播种。已有任意核心数据时跳过，保证重启不会重复插入。
 */
export async function seedDatabase(gateway: DataGateway = getDataGateway()): Promise<void> {
  const existingTickets = await gateway.findTickets();
  if (existingTickets.length > 0) return;

  await gateway.runInTransaction(async (uow) => {
    // 已有种子（如 MySQL init 数据）则不重复
    if ((await uow.findTickets()).length > 0) return;

    // 已存在的备件（Prisma 环境可能由 init.sql 播种）只做幂等补齐
    for (const part of SEED_PARTS) {
      const exists = await uow.findPartByCode(part.part_code);
      if (!exists) await uow.upsertPart(part);
    }

    const assets = await uow.findAssets();
    if (assets.length === 0) {
      for (const asset of SEED_ASSETS) await uow.insertAsset(asset);
    }

    const crews = await uow.findCrews();
    if (crews.length === 0) {
      for (const crew of SEED_CREWS) await uow.insertCrew(crew);
    }

    const faults = await uow.findFaultReports();
    if (faults.length === 0) {
      for (const fault of SEED_FAULTS) {
        await uow.insertFaultReport(fault);
      }
      // 为每条已登记报修生成一张 WAIT_DISPATCH 工单，闭环从“待派工”开始
      const inserted = await uow.findFaultReports();
      for (const fault of inserted) {
        await uow.insertTicket({
          fault_report_id: fault.id,
          team_id: null,
          dispatcher_id: null,
          priority: fault.severity,
          status: "WAIT_DISPATCH",
          assigned_at: null,
          arrived_at: null,
          repairing_at: null,
          restored_at: null,
          closed_at: null
        });
        const ticket = await uow.findTicketByFaultReportId(fault.id);
        if (ticket) {
          await uow.insertTicketEventLog({
            ticket_id: ticket.id,
            from_status: null,
            to_status: "WAIT_DISPATCH",
            operator_id: null,
            remark: "故障报修生成工单（种子）"
          });
        }
        await uow.updateFaultReport(fault.id, { status: "CONVERTED" });
      }
    }

    await uow.insertAuditLog({
      actor: "system",
      action: "seed",
      target_type: "System",
      target_id: null,
      detail: "本地种子数据播种完成"
    });
  });
}
