import { PrismaClient, Prisma } from "@prisma/client";
import type { DataGateway, Criteria, UnitOfWork, UpdateOutcome } from "./DataGateway";
import type {
  AuditLogRow,
  CrewRow,
  FaultReportRow,
  GridAssetRow,
  InventoryTransactionRow,
  RepairTicketRow,
  SparePartRow,
  SparePartUsageRow,
  TicketEventLogRow
} from "./types";

/**
 * 把等值条件转为 Prisma WHERE。并发安全由数据库行锁保证：
 * updateMany({ where: { id, status: 'WAIT_DISPATCH' } }) 生成
 * UPDATE ... WHERE ...，同一时刻只有一个事务能命中并拿到 affectedRows=1。
 */
function ticketWhere(criteria?: Criteria<RepairTicketRow>): Prisma.RepairTicketWhereInput {
  const where: Prisma.RepairTicketWhereInput = {};
  if (criteria) {
    if (criteria.id !== undefined) where.id = criteria.id as number;
    if (criteria.status !== undefined) where.status = criteria.status as string;
    if (criteria.team_id !== undefined) where.teamId = criteria.team_id as number | null;
    if (criteria.fault_report_id !== undefined) where.faultReportId = criteria.fault_report_id as number;
  }
  return where;
}

function crewWhere(criteria?: Criteria<CrewRow>): Prisma.CrewWhereInput {
  const where: Prisma.CrewWhereInput = {};
  if (criteria) {
    if (criteria.id !== undefined) where.id = criteria.id as number;
    if (criteria.duty_status !== undefined) where.dutyStatus = criteria.duty_status as string;
    if (Object.prototype.hasOwnProperty.call(criteria, "current_ticket_id")) {
      where.currentTicketId = (criteria.current_ticket_id ?? null) as number | null;
    }
  }
  return where;
}

function usageWhere(criteria?: Criteria<SparePartUsageRow>): Prisma.SparePartUsageWhereInput {
  const where: Prisma.SparePartUsageWhereInput = {};
  if (criteria) {
    if (criteria.id !== undefined) where.id = criteria.id as number;
    if (criteria.usage_status !== undefined) where.usageStatus = criteria.usage_status as string;
    if (criteria.ticket_id !== undefined) where.ticketId = criteria.ticket_id as number;
    if (criteria.part_code !== undefined) where.partCode = criteria.part_code as string;
  }
  return where;
}

function toTicketRow(row: Prisma.RepairTicketGetPayload<Record<string, never>> | null): RepairTicketRow | null {
  if (!row) return null;
  return {
    id: row.id,
    fault_report_id: row.faultReportId,
    team_id: row.teamId,
    dispatcher_id: row.dispatcherId,
    priority: row.priority,
    status: row.status,
    assigned_at: row.assignedAt,
    arrived_at: row.arrivedAt,
    repairing_at: row.repairingAt,
    restored_at: row.restoredAt,
    closed_at: row.closedAt
  };
}

function toCrewRow(row: Prisma.CrewGetPayload<Record<string, never>> | null): CrewRow | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    leader_id: row.leaderId,
    skill_tags: row.skillTags,
    duty_status: row.dutyStatus,
    current_ticket_id: row.currentTicketId,
    contact_phone: row.contactPhone
  };
}

function toUsageRow(row: Prisma.SparePartUsageGetPayload<Record<string, never>> | null): SparePartUsageRow | null {
  if (!row) return null;
  return {
    id: row.id,
    ticket_id: row.ticketId,
    part_code: row.partCode,
    part_name: row.partName,
    quantity: row.quantity,
    warehouse_name: row.warehouseName,
    usage_status: row.usageStatus,
    approved_by: row.approvedBy,
    approved_at: row.approvedAt,
    created_at: row.createdAt
  };
}

function toPartRow(row: Prisma.SparePartGetPayload<Record<string, never>>): SparePartRow {
  return {
    id: row.id,
    part_code: row.partCode,
    part_name: row.partName,
    warehouse_name: row.warehouseName,
    stock_quantity: row.stockQuantity
  };
}

/**
 * Prisma + MySQL 8 生产适配器。
 * runInTransaction 使用交互式事务（默认 REPEATABLE READ），
 * 派工/审批/状态推进中的“读后条件更新”在同一连接的行锁下串行裁决。
 */
export class PrismaDataGateway implements DataGateway {
  private readonly client: PrismaClient;

  constructor(databaseUrl?: string) {
    this.client = new PrismaClient(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);
  }

  async ensureReady(): Promise<void> {
    await this.client.$connect();
  }

  async runInTransaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    return this.client.$transaction(
      async (tx) => {
        const uow = new PrismaUnitOfWork(tx as Prisma.TransactionClient);
        return work(uow);
      },
      // 并发派工会在行锁上排队；给足等待时间，让竞争方依次裁决而不是提前超时
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 10000, timeout: 20000 }
    );
  }

  async reset(): Promise<void> {
    // 仅供测试环境调用：生产不允许清库
    if (process.env.NODE_ENV !== "test") return;
    await this.client.sparePartUsage.deleteMany();
    await this.client.inventoryTransaction.deleteMany();
    await this.client.ticketEventLog.deleteMany();
    await this.client.auditLog.deleteMany();
    await this.client.repairTicket.deleteMany();
    await this.client.crew.deleteMany();
    await this.client.faultReport.deleteMany();
    await this.client.gridAsset.deleteMany();
    await this.client.sparePart.deleteMany();
  }

  // ---- 只读 ----
  async findAssets(criteria?: Criteria<GridAssetRow>) {
    return this.client.gridAsset.findMany({ where: this.assetWhere(criteria) }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        asset_code: row.assetCode,
        asset_type: row.assetType,
        feeder_line: row.feederLine,
        voltage_level: row.voltageLevel,
        location_desc: row.locationDesc,
        health_status: row.healthStatus,
        owner_team_id: row.ownerTeamId
      }))
    );
  }
  private assetWhere(criteria?: Criteria<GridAssetRow>): Prisma.GridAssetWhereInput {
    const where: Prisma.GridAssetWhereInput = {};
    if (criteria?.feeder_line !== undefined) where.feederLine = criteria.feeder_line as string;
    if (criteria?.health_status !== undefined) where.healthStatus = criteria.health_status as string;
    if (criteria?.id !== undefined) where.id = criteria.id as number;
    return where;
  }
  async findAssetById(id: number) {
    const row = await this.client.gridAsset.findUnique({ where: { id } });
    return row
      ? {
          id: row.id,
          asset_code: row.assetCode,
          asset_type: row.assetType,
          feeder_line: row.feederLine,
          voltage_level: row.voltageLevel,
          location_desc: row.locationDesc,
          health_status: row.healthStatus,
          owner_team_id: row.ownerTeamId
        }
      : null;
  }
  async insertAsset(): Promise<GridAssetRow> {
    throw new Error("GridAsset 写操作必须在事务内执行");
  }

  async findFaultReports(criteria?: Criteria<FaultReportRow>) {
    const where: Prisma.FaultReportWhereInput = {};
    if (criteria?.id !== undefined) where.id = criteria.id as number;
    if (criteria?.asset_id !== undefined) where.assetId = criteria.asset_id as number | null;
    if (criteria?.status !== undefined) where.status = criteria.status as string;
    if (criteria?.severity !== undefined) where.severity = criteria.severity as string;
    return this.client.faultReport.findMany({ where }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        reporter_name: row.reporterName,
        phone: row.phone,
        asset_id: row.assetId,
        fault_type: row.faultType,
        address_desc: row.addressDesc,
        severity: row.severity,
        report_channel: row.reportChannel,
        status: row.status
      }))
    );
  }
  async findFaultReportById(id: number) {
    const rows = await this.findFaultReports({ id });
    return rows[0] ?? null;
  }
  async insertFaultReport(): Promise<FaultReportRow> {
    throw new Error("FaultReport 写操作必须在事务内执行");
  }
  async updateFaultReport(): Promise<void> {
    throw new Error("FaultReport 写操作必须在事务内执行");
  }

  async findTickets(criteria?: Criteria<RepairTicketRow>) {
    return this.client.repairTicket.findMany({ where: ticketWhere(criteria) }).then((rows) => rows.map((r) => toTicketRow(r)!));
  }
  async findTicketById(id: number) {
    return toTicketRow(await this.client.repairTicket.findUnique({ where: { id } }));
  }
  async findTicketByFaultReportId(faultReportId: number) {
    return toTicketRow(await this.client.repairTicket.findUnique({ where: { faultReportId } }));
  }
  async insertTicket(): Promise<RepairTicketRow> {
    throw new Error("RepairTicket 写操作必须在事务内执行");
  }
  async updateTicketIf(): Promise<UpdateOutcome<RepairTicketRow>> {
    throw new Error("RepairTicket 写操作必须在事务内执行");
  }

  async findCrews(criteria?: Criteria<CrewRow>) {
    return this.client.crew.findMany({ where: crewWhere(criteria) }).then((rows) => rows.map((r) => toCrewRow(r)!));
  }
  async findCrewById(id: number) {
    return toCrewRow(await this.client.crew.findUnique({ where: { id } }));
  }
  async insertCrew(): Promise<CrewRow> {
    throw new Error("Crew 写操作必须在事务内执行");
  }
  async updateCrewIf(): Promise<UpdateOutcome<CrewRow>> {
    throw new Error("Crew 写操作必须在事务内执行");
  }

  async findParts() {
    return this.client.sparePart.findMany().then((rows) => rows.map(toPartRow));
  }
  async findPartByCode(partCode: string) {
    const row = await this.client.sparePart.findUnique({ where: { partCode } });
    return row ? toPartRow(row) : null;
  }
  async upsertPart(): Promise<SparePartRow> {
    throw new Error("SparePart 写操作必须在事务内执行");
  }
  async reserveStock(): Promise<UpdateOutcome<SparePartRow>> {
    throw new Error("SparePart 写操作必须在事务内执行");
  }
  async adjustStock(): Promise<SparePartRow> {
    throw new Error("SparePart 写操作必须在事务内执行");
  }

  async findUsages(criteria?: Criteria<SparePartUsageRow>) {
    return this.client.sparePartUsage.findMany({ where: usageWhere(criteria), orderBy: { id: "asc" } }).then((rows) => rows.map((r) => toUsageRow(r)!));
  }
  async insertUsage(): Promise<SparePartUsageRow> {
    throw new Error("SparePartUsage 写操作必须在事务内执行");
  }
  async updateUsageIf(): Promise<UpdateOutcome<SparePartUsageRow>> {
    throw new Error("SparePartUsage 写操作必须在事务内执行");
  }

  async findInventoryTransactions(criteria?: Criteria<InventoryTransactionRow>) {
    const where: Prisma.InventoryTransactionWhereInput = {};
    if (criteria?.part_code !== undefined) where.partCode = criteria.part_code as string;
    if (criteria?.ticket_id !== undefined) where.ticketId = criteria.ticket_id as number | null;
    return this.client.inventoryTransaction.findMany({ where, orderBy: { id: "asc" } }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        part_code: row.partCode,
        change_type: row.changeType,
        quantity: row.quantity,
        balance_after: row.balanceAfter,
        ticket_id: row.ticketId,
        usage_id: row.usageId,
        operator_id: row.operatorId,
        remark: row.remark,
        created_at: row.createdAt
      }))
    );
  }
  async insertInventoryTransaction(): Promise<InventoryTransactionRow> {
    throw new Error("InventoryTransaction 写操作必须在事务内执行");
  }

  async findTicketEventLogs(ticketId?: number) {
    return this.client.ticketEventLog
      .findMany({ where: ticketId !== undefined ? { ticketId } : {}, orderBy: { id: "asc" } })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          ticket_id: row.ticketId,
          from_status: row.fromStatus,
          to_status: row.toStatus,
          operator_id: row.operatorId,
          remark: row.remark,
          created_at: row.createdAt
        }))
      );
  }
  async insertTicketEventLog(): Promise<TicketEventLogRow> {
    throw new Error("TicketEventLog 写操作必须在事务内执行");
  }

  async findAuditLogs(criteria?: Criteria<AuditLogRow>) {
    const where: Prisma.AuditLogWhereInput = {};
    if (criteria?.actor !== undefined) where.actor = criteria.actor as string;
    if (criteria?.action !== undefined) where.action = criteria.action as string;
    return this.client.auditLog.findMany({ where, orderBy: { id: "asc" } }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        actor: row.actor,
        action: row.action,
        target_type: row.targetType,
        target_id: row.targetId,
        detail: row.detail,
        created_at: row.createdAt
      }))
    );
  }
  async insertAuditLog(): Promise<AuditLogRow> {
    throw new Error("AuditLog 写操作必须在事务内执行");
  }
}

class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async findAssets(): Promise<GridAssetRow[]> {
    return this.tx.gridAsset.findMany().then((rows) =>
      rows.map((row) => ({
        id: row.id,
        asset_code: row.assetCode,
        asset_type: row.assetType,
        feeder_line: row.feederLine,
        voltage_level: row.voltageLevel,
        location_desc: row.locationDesc,
        health_status: row.healthStatus,
        owner_team_id: row.ownerTeamId
      }))
    );
  }
  async findAssetById(id: number) {
    const row = await this.tx.gridAsset.findUnique({ where: { id } });
    return row
      ? {
          id: row.id,
          asset_code: row.assetCode,
          asset_type: row.assetType,
          feeder_line: row.feederLine,
          voltage_level: row.voltageLevel,
          location_desc: row.locationDesc,
          health_status: row.healthStatus,
          owner_team_id: row.ownerTeamId
        }
      : null;
  }
  async insertAsset(input: Omit<GridAssetRow, "id">) {
    const created = await this.tx.gridAsset.create({
      data: {
        assetCode: input.asset_code,
        assetType: input.asset_type,
        feederLine: input.feeder_line,
        voltageLevel: input.voltage_level,
        locationDesc: input.location_desc,
        healthStatus: input.health_status,
        ownerTeamId: input.owner_team_id
      }
    });
    return {
      id: created.id,
      asset_code: created.assetCode,
      asset_type: created.assetType,
      feeder_line: created.feederLine,
      voltage_level: created.voltageLevel,
      location_desc: created.locationDesc,
      health_status: created.healthStatus,
      owner_team_id: created.ownerTeamId
    };
  }

  async findFaultReports(): Promise<FaultReportRow[]> {
    return this.tx.faultReport.findMany().then((rows) =>
      rows.map((row) => ({
        id: row.id,
        reporter_name: row.reporterName,
        phone: row.phone,
        asset_id: row.assetId,
        fault_type: row.faultType,
        address_desc: row.addressDesc,
        severity: row.severity,
        report_channel: row.reportChannel,
        status: row.status
      }))
    );
  }
  async findFaultReportById(id: number) {
    const row = await this.tx.faultReport.findUnique({ where: { id } });
    return row
      ? {
          id: row.id,
          reporter_name: row.reporterName,
          phone: row.phone,
          asset_id: row.assetId,
          fault_type: row.faultType,
          address_desc: row.addressDesc,
          severity: row.severity,
          report_channel: row.reportChannel,
          status: row.status
        }
      : null;
  }
  async insertFaultReport(input: Omit<FaultReportRow, "id">) {
    const created = await this.tx.faultReport.create({
      data: {
        reporterName: input.reporter_name,
        phone: input.phone,
        assetId: input.asset_id,
        faultType: input.fault_type,
        addressDesc: input.address_desc,
        severity: input.severity,
        reportChannel: input.report_channel,
        status: input.status
      }
    });
    return {
      id: created.id,
      reporter_name: created.reporterName,
      phone: created.phone,
      asset_id: created.assetId,
      fault_type: created.faultType,
      address_desc: created.addressDesc,
      severity: created.severity,
      report_channel: created.reportChannel,
      status: created.status
    };
  }
  async updateFaultReport(id: number, patch: Partial<FaultReportRow>) {
    await this.tx.faultReport.update({ where: { id }, data: this.faultReportData(patch) });
  }
  private faultReportData(patch: Partial<FaultReportRow>): Prisma.FaultReportUpdateInput {
    const data: Prisma.FaultReportUpdateInput = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.severity !== undefined) data.severity = patch.severity;
    return data;
  }

  async findTickets(criteria?: Criteria<RepairTicketRow>) {
    return this.tx.repairTicket.findMany({ where: ticketWhere(criteria) }).then((rows) => rows.map((r) => toTicketRow(r)!));
  }
  async findTicketById(id: number) {
    return toTicketRow(await this.tx.repairTicket.findUnique({ where: { id } }));
  }
  async findTicketByFaultReportId(faultReportId: number) {
    return toTicketRow(await this.tx.repairTicket.findUnique({ where: { faultReportId } }));
  }
  async insertTicket(input: Omit<RepairTicketRow, "id">) {
    const created = await this.tx.repairTicket.create({
      data: {
        faultReportId: input.fault_report_id,
        teamId: input.team_id,
        dispatcherId: input.dispatcher_id,
        priority: input.priority,
        status: input.status,
        assignedAt: (input.assigned_at as Date) ?? null,
        arrivedAt: (input.arrived_at as Date) ?? null,
        repairingAt: (input.repairing_at as Date) ?? null,
        restoredAt: (input.restored_at as Date) ?? null,
        closedAt: (input.closed_at as Date) ?? null
      }
    });
    return toTicketRow(created)!;
  }
  async updateTicketIf(id: number, expect: Criteria<RepairTicketRow>, patch: Partial<RepairTicketRow>) {
    const result = await this.tx.repairTicket.updateMany({
      where: { ...ticketWhere(expect), id },
      data: this.ticketPatch(patch)
    });
    const row = result.count > 0 ? await this.tx.repairTicket.findUnique({ where: { id } }) : null;
    return { affected: result.count, row: toTicketRow(row) };
  }
  private ticketPatch(patch: Partial<RepairTicketRow>): Prisma.RepairTicketUncheckedUpdateManyInput {
    const data: Prisma.RepairTicketUncheckedUpdateManyInput = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.team_id !== undefined) data.teamId = patch.team_id;
    if (patch.dispatcher_id !== undefined) data.dispatcherId = patch.dispatcher_id;
    if (patch.priority !== undefined) data.priority = patch.priority;
    if ("assigned_at" in patch) data.assignedAt = (patch.assigned_at as Date) ?? null;
    if ("arrived_at" in patch) data.arrivedAt = (patch.arrived_at as Date) ?? null;
    if ("repairing_at" in patch) data.repairingAt = (patch.repairing_at as Date) ?? null;
    if ("restored_at" in patch) data.restoredAt = (patch.restored_at as Date) ?? null;
    if ("closed_at" in patch) data.closedAt = (patch.closed_at as Date) ?? null;
    return data;
  }

  async findCrews(criteria?: Criteria<CrewRow>) {
    return this.tx.crew.findMany({ where: crewWhere(criteria) }).then((rows) => rows.map((r) => toCrewRow(r)!));
  }
  async findCrewById(id: number) {
    return toCrewRow(await this.tx.crew.findUnique({ where: { id } }));
  }
  async insertCrew(input: Omit<CrewRow, "id">) {
    const created = await this.tx.crew.create({
      data: {
        name: input.name,
        leaderId: input.leader_id,
        skillTags: input.skill_tags,
        dutyStatus: input.duty_status,
        currentTicketId: input.current_ticket_id,
        contactPhone: input.contact_phone
      }
    });
    return toCrewRow(created)!;
  }
  async updateCrewIf(id: number, expect: Criteria<CrewRow>, patch: Partial<CrewRow>) {
    const where: Prisma.CrewWhereInput = { ...crewWhere(expect), id };
    // current_ticket_id IS NULL 需要显式表达
    if (Object.prototype.hasOwnProperty.call(expect, "current_ticket_id") && expect.current_ticket_id === null) {
      where.currentTicketId = null;
    }
    const data: Prisma.CrewUncheckedUpdateManyInput = {};
    if (patch.current_ticket_id !== undefined) data.currentTicketId = patch.current_ticket_id;
    if (patch.duty_status !== undefined) data.dutyStatus = patch.duty_status;
    const result = await this.tx.crew.updateMany({ where, data });
    const row = result.count > 0 ? await this.tx.crew.findUnique({ where: { id } }) : null;
    return { affected: result.count, row: toCrewRow(row) };
  }

  async findParts() {
    return this.tx.sparePart.findMany().then((rows) => rows.map(toPartRow));
  }
  async findPartByCode(partCode: string) {
    const part = await this.tx.sparePart.findUnique({ where: { partCode } });
    return part ? toPartRow(part) : null;
  }
  async upsertPart(input: Omit<SparePartRow, "id">) {
    const part = await this.tx.sparePart.upsert({
      where: { partCode: input.part_code },
      update: { partName: input.part_name, warehouseName: input.warehouse_name, stockQuantity: input.stock_quantity },
      create: {
        partCode: input.part_code,
        partName: input.part_name,
        warehouseName: input.warehouse_name,
        stockQuantity: input.stock_quantity
      }
    });
    return toPartRow(part);
  }
  async reserveStock(partCode: string, quantity: number): Promise<UpdateOutcome<SparePartRow>> {
    // 原子条件扣减：库存不足时 affected=0，调用方抛错触发整事务回滚
    const result = await this.tx.sparePart.updateMany({
      where: { partCode, stockQuantity: { gte: quantity } },
      data: { stockQuantity: { decrement: quantity } }
    });
    const row = result.count > 0 ? await this.tx.sparePart.findUnique({ where: { partCode } }) : null;
    return { affected: result.count, row: row ? toPartRow(row) : null };
  }
  async adjustStock(partCode: string, delta: number): Promise<SparePartRow> {
    const part = await this.tx.sparePart.update({
      where: { partCode },
      data: { stockQuantity: { increment: delta } }
    });
    return toPartRow(part);
  }

  async findUsages(criteria?: Criteria<SparePartUsageRow>) {
    return this.tx.sparePartUsage.findMany({ where: usageWhere(criteria), orderBy: { id: "asc" } }).then((rows) => rows.map((r) => toUsageRow(r)!));
  }
  async insertUsage(input: Omit<SparePartUsageRow, "id" | "created_at">) {
    const created = await this.tx.sparePartUsage.create({
      data: {
        ticketId: input.ticket_id,
        partCode: input.part_code,
        partName: input.part_name,
        quantity: input.quantity,
        warehouseName: input.warehouse_name,
        usageStatus: input.usage_status,
        approvedBy: input.approved_by,
        approvedAt: (input.approved_at as Date) ?? null
      }
    });
    return toUsageRow(created)!;
  }
  async updateUsageIf(id: number, expect: Criteria<SparePartUsageRow>, patch: Partial<SparePartUsageRow>) {
    const data: Prisma.SparePartUsageUncheckedUpdateManyInput = {};
    if (patch.usage_status !== undefined) data.usageStatus = patch.usage_status;
    if (patch.approved_by !== undefined) data.approvedBy = patch.approved_by;
    if ("approved_at" in patch) data.approvedAt = (patch.approved_at as Date) ?? null;
    const result = await this.tx.sparePartUsage.updateMany({ where: { ...usageWhere(expect), id }, data });
    const row = result.count > 0 ? await this.tx.sparePartUsage.findUnique({ where: { id } }) : null;
    return { affected: result.count, row: toUsageRow(row) };
  }

  async findInventoryTransactions(criteria?: Criteria<InventoryTransactionRow>) {
    const where: Prisma.InventoryTransactionWhereInput = {};
    if (criteria?.part_code !== undefined) where.partCode = criteria.part_code as string;
    if (criteria?.ticket_id !== undefined) where.ticketId = criteria.ticket_id as number | null;
    return this.tx.inventoryTransaction.findMany({ where, orderBy: { id: "asc" } }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        part_code: row.partCode,
        change_type: row.changeType,
        quantity: row.quantity,
        balance_after: row.balanceAfter,
        ticket_id: row.ticketId,
        usage_id: row.usageId,
        operator_id: row.operatorId,
        remark: row.remark,
        created_at: row.createdAt
      }))
    );
  }
  async insertInventoryTransaction(input: Omit<InventoryTransactionRow, "id" | "created_at">) {
    const created = await this.tx.inventoryTransaction.create({
      data: {
        partCode: input.part_code,
        changeType: input.change_type,
        quantity: input.quantity,
        balanceAfter: input.balance_after,
        ticketId: input.ticket_id,
        usageId: input.usage_id,
        operatorId: input.operator_id,
        remark: input.remark
      }
    });
    return {
      id: created.id,
      part_code: created.partCode,
      change_type: created.changeType,
      quantity: created.quantity,
      balance_after: created.balanceAfter,
      ticket_id: created.ticketId,
      usage_id: created.usageId,
      operator_id: created.operatorId,
      remark: created.remark,
      created_at: created.createdAt
    };
  }

  async findTicketEventLogs(ticketId?: number) {
    return this.tx.ticketEventLog
      .findMany({ where: ticketId !== undefined ? { ticketId } : {}, orderBy: { id: "asc" } })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          ticket_id: row.ticketId,
          from_status: row.fromStatus,
          to_status: row.toStatus,
          operator_id: row.operatorId,
          remark: row.remark,
          created_at: row.createdAt
        }))
      );
  }
  async insertTicketEventLog(input: Omit<TicketEventLogRow, "id" | "created_at">) {
    const created = await this.tx.ticketEventLog.create({
      data: {
        ticketId: input.ticket_id,
        fromStatus: input.from_status,
        toStatus: input.to_status,
        operatorId: input.operator_id,
        remark: input.remark
      }
    });
    return {
      id: created.id,
      ticket_id: created.ticketId,
      from_status: created.fromStatus,
      to_status: created.toStatus,
      operator_id: created.operatorId,
      remark: created.remark,
      created_at: created.createdAt
    };
  }

  async findAuditLogs(): Promise<AuditLogRow[]> {
    return this.tx.auditLog.findMany({ orderBy: { id: "asc" } }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        actor: row.actor,
        action: row.action,
        target_type: row.targetType,
        target_id: row.targetId,
        detail: row.detail,
        created_at: row.createdAt
      }))
    );
  }
  async insertAuditLog(input: Omit<AuditLogRow, "id" | "created_at">) {
    const created = await this.tx.auditLog.create({
      data: {
        actor: input.actor,
        action: input.action,
        targetType: input.target_type,
        targetId: input.target_id,
        detail: input.detail
      }
    });
    return {
      id: created.id,
      actor: created.actor,
      action: created.action,
      target_type: created.targetType,
      target_id: created.targetId,
      detail: created.detail,
      created_at: created.createdAt
    };
  }
}
