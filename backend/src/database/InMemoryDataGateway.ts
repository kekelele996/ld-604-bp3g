import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
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

type TableMap = {
  gridAsset: GridAssetRow[];
  faultReport: FaultReportRow[];
  repairTicket: RepairTicketRow[];
  crew: CrewRow[];
  sparePart: SparePartRow[];
  sparePartUsage: SparePartUsageRow[];
  inventoryTransaction: InventoryTransactionRow[];
  ticketEventLog: TicketEventLogRow[];
  auditLog: AuditLogRow[];
};

/** 事务内可变快照：提交时整体替换，模拟 MySQL 事务原子可见性 */
interface Snapshot {
  tables: TableMap;
  sequences: Record<keyof TableMap, number>;
}

function matchCriteria(row: object, criteria?: Record<string, unknown>): boolean {
  if (!criteria) return true;
  return Object.entries(criteria).every(([key, expected]) => (row as Record<string, unknown>)[key] === expected);
}

function nowDate(): Date {
  return new Date();
}

/**
 * 内存持久化适配器。
 * - 所有事务串行执行，等价于 MySQL 中“先拿到行锁的事务先提交”的调度结果；
 * - 条件式更新（WHERE 等值）严格按受影响行数判定，并发派工/重复审批只有一次 affected=1；
 * - 事务内抛出异常则快照丢弃，派工、班组占用、领用记录、库存流水全部不写入。
 * 该适配器让同一套 Service 在没有 MySQL 的环境（本地评审/单测）下也能验证闭环。
 */
export class InMemoryDataGateway implements DataGateway {
  private committed: Snapshot = InMemoryDataGateway.emptySnapshot();
  /** 事务串行队列：保证并发请求按提交顺序依次尝试，竞争失败者 affected=0 */
  private txQueue: Promise<unknown> = Promise.resolve();
  /** 可选快照文件：配置后每次提交原子落盘，重启时回放（内存模式也满足重启一致） */
  private snapshotFile: string | null;

  constructor(snapshotFile?: string) {
    this.snapshotFile = snapshotFile ?? process.env.MEMORY_SNAPSHOT_FILE ?? null;
    if (this.snapshotFile) this.restoreFromDisk();
  }

  /** 从磁盘回放已提交快照（重启后状态、库存余额与流水完全一致） */
  private restoreFromDisk(): void {
    if (!this.snapshotFile || !existsSync(this.snapshotFile)) return;
    try {
      const raw = JSON.parse(readFileSync(this.snapshotFile, "utf8")) as Snapshot;
      // Date 字段在 JSON 中为字符串，行类型本身允许 string|Date，业务读取时统一兼容
      this.committed = raw;
    } catch {
      // 快照损坏时以空库启动并重新播种
      this.committed = InMemoryDataGateway.emptySnapshot();
    }
  }

  private persist(): void {
    if (!this.snapshotFile) return;
    try {
      mkdirSync(dirname(this.snapshotFile), { recursive: true });
      writeFileSync(this.snapshotFile, JSON.stringify(this.committed));
    } catch {
      /* 快照失败不影响已提交事务 */
    }
  }

  private static emptySnapshot(): Snapshot {
    return {
      tables: {
        gridAsset: [],
        faultReport: [],
        repairTicket: [],
        crew: [],
        sparePart: [],
        sparePartUsage: [],
        inventoryTransaction: [],
        ticketEventLog: [],
        auditLog: []
      },
      sequences: {
        gridAsset: 0,
        faultReport: 0,
        repairTicket: 0,
        crew: 0,
        sparePart: 0,
        sparePartUsage: 0,
        inventoryTransaction: 0,
        ticketEventLog: 0,
        auditLog: 0
      }
    };
  }

  async ensureReady(): Promise<void> {
    /* 内存表随进程创建，无需建表 */
  }

  async reset(): Promise<void> {
    this.committed = InMemoryDataGateway.emptySnapshot();
    this.persist();
  }

  /** 测试与种子使用的非事务装载入口 */
  seed(tables: Partial<TableMap>): void {
    (Object.keys(tables) as (keyof TableMap)[]).forEach((name) => {
      const rows = tables[name] ?? [];
      this.committed.tables[name] = rows.map((row) => ({ ...row })) as never;
      this.committed.sequences[name] = rows.reduce((max, row) => Math.max(max, Number((row as { id: number }).id)), 0);
    });
  }

  async runInTransaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    // 串行化：新事务必须等待前一个事务提交/回滚后才能开始
    const run = this.txQueue.then(async () => {
      const snapshot: Snapshot = {
        tables: structuredClone(this.committed.tables),
        sequences: { ...this.committed.sequences }
      };
      const uow = new InMemoryUnitOfWork(snapshot);
      const result = await work(uow);
      // 无异常 → 快照整体提交并持久化
      this.committed = snapshot;
      this.persist();
      return result;
    });
    // 队列推进不能因为单个事务失败而断裂
    this.txQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private snapshotForRead(): Snapshot {
    return this.committed;
  }

  // ---- 只读访问（事务外）----
  async findAssets(criteria?: Criteria<GridAssetRow>) {
    return this.snapshotForRead().tables.gridAsset.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async findAssetById(id: number) {
    return this.snapshotForRead().tables.gridAsset.find((row) => row.id === id) ?? null;
  }
  async insertAsset(): Promise<GridAssetRow> {
    throw new Error("GridAsset 写操作必须在事务内执行");
  }
  async findFaultReports(criteria?: Criteria<FaultReportRow>) {
    return this.snapshotForRead().tables.faultReport.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async findFaultReportById(id: number) {
    return this.snapshotForRead().tables.faultReport.find((row) => row.id === id) ?? null;
  }
  async insertFaultReport(): Promise<FaultReportRow> {
    throw new Error("FaultReport 写操作必须在事务内执行");
  }
  async updateFaultReport(): Promise<void> {
    throw new Error("FaultReport 写操作必须在事务内执行");
  }
  async findTickets(criteria?: Criteria<RepairTicketRow>) {
    return this.snapshotForRead().tables.repairTicket.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async findTicketById(id: number) {
    return this.snapshotForRead().tables.repairTicket.find((row) => row.id === id) ?? null;
  }
  async findTicketByFaultReportId(faultReportId: number) {
    return this.snapshotForRead().tables.repairTicket.find((row) => row.fault_report_id === faultReportId) ?? null;
  }
  async insertTicket(): Promise<RepairTicketRow> {
    throw new Error("RepairTicket 写操作必须在事务内执行");
  }
  async updateTicketIf(): Promise<UpdateOutcome<RepairTicketRow>> {
    throw new Error("RepairTicket 写操作必须在事务内执行");
  }
  async findCrews(criteria?: Criteria<CrewRow>) {
    return this.snapshotForRead().tables.crew.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async findCrewById(id: number) {
    return this.snapshotForRead().tables.crew.find((row) => row.id === id) ?? null;
  }
  async insertCrew(): Promise<CrewRow> {
    throw new Error("Crew 写操作必须在事务内执行");
  }
  async updateCrewIf(): Promise<UpdateOutcome<CrewRow>> {
    throw new Error("Crew 写操作必须在事务内执行");
  }
  async findParts() {
    return [...this.snapshotForRead().tables.sparePart];
  }
  async findPartByCode(partCode: string) {
    return this.snapshotForRead().tables.sparePart.find((row) => row.part_code === partCode) ?? null;
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
    return this.snapshotForRead().tables.sparePartUsage.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async insertUsage(): Promise<SparePartUsageRow> {
    throw new Error("SparePartUsage 写操作必须在事务内执行");
  }
  async updateUsageIf(): Promise<UpdateOutcome<SparePartUsageRow>> {
    throw new Error("SparePartUsage 写操作必须在事务内执行");
  }
  async findInventoryTransactions(criteria?: Criteria<InventoryTransactionRow>) {
    return this.snapshotForRead().tables.inventoryTransaction.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async insertInventoryTransaction(): Promise<InventoryTransactionRow> {
    throw new Error("InventoryTransaction 写操作必须在事务内执行");
  }
  async findTicketEventLogs(ticketId?: number) {
    return this.snapshotForRead().tables.ticketEventLog
      .filter((row) => ticketId === undefined || row.ticket_id === ticketId)
      .sort((a, b) => Number(a.id) - Number(b.id));
  }
  async insertTicketEventLog(): Promise<TicketEventLogRow> {
    throw new Error("TicketEventLog 写操作必须在事务内执行");
  }
  async findAuditLogs(criteria?: Criteria<AuditLogRow>) {
    return this.snapshotForRead().tables.auditLog.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async insertAuditLog(): Promise<AuditLogRow> {
    throw new Error("AuditLog 写操作必须在事务内执行");
  }
}

class InMemoryUnitOfWork implements UnitOfWork {
  constructor(private readonly snapshot: Snapshot) {}

  private nextId(name: keyof TableMap): number {
    this.snapshot.sequences[name] += 1;
    return this.snapshot.sequences[name];
  }

  // ---- 配网资产 ----
  async findAssets(criteria?: Criteria<GridAssetRow>) {
    return this.snapshot.tables.gridAsset.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async findAssetById(id: number) {
    return this.snapshot.tables.gridAsset.find((row) => row.id === id) ?? null;
  }
  async insertAsset(input: Omit<GridAssetRow, "id">): Promise<GridAssetRow> {
    const row: GridAssetRow = { id: this.nextId("gridAsset"), ...input };
    this.snapshot.tables.gridAsset.push(row);
    return { ...row };
  }

  // ---- 故障报修 ----
  async findFaultReports(criteria?: Criteria<FaultReportRow>) {
    return this.snapshot.tables.faultReport.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async findFaultReportById(id: number) {
    return this.snapshot.tables.faultReport.find((row) => row.id === id) ?? null;
  }
  async insertFaultReport(input: Omit<FaultReportRow, "id">): Promise<FaultReportRow> {
    const row: FaultReportRow = { id: this.nextId("faultReport"), ...input };
    this.snapshot.tables.faultReport.push(row);
    return { ...row };
  }
  async updateFaultReport(id: number, patch: Partial<FaultReportRow>) {
    const row = this.snapshot.tables.faultReport.find((item) => item.id === id);
    if (row) Object.assign(row, patch);
  }

  // ---- 抢修工单 ----
  async findTickets(criteria?: Criteria<RepairTicketRow>) {
    return this.snapshot.tables.repairTicket.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async findTicketById(id: number) {
    return this.snapshot.tables.repairTicket.find((row) => row.id === id) ?? null;
  }
  async findTicketByFaultReportId(faultReportId: number) {
    return this.snapshot.tables.repairTicket.find((row) => row.fault_report_id === faultReportId) ?? null;
  }
  async insertTicket(input: Omit<RepairTicketRow, "id">): Promise<RepairTicketRow> {
    const row: RepairTicketRow = { id: this.nextId("repairTicket"), ...input };
    this.snapshot.tables.repairTicket.push(row);
    return { ...row };
  }
  async updateTicketIf(id: number, expect: Criteria<RepairTicketRow>, patch: Partial<RepairTicketRow>) {
    return this.conditionalUpdate("repairTicket", id, expect, patch);
  }

  // ---- 抢修班组 ----
  async findCrews(criteria?: Criteria<CrewRow>) {
    return this.snapshot.tables.crew.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async findCrewById(id: number) {
    return this.snapshot.tables.crew.find((row) => row.id === id) ?? null;
  }
  async insertCrew(input: Omit<CrewRow, "id">): Promise<CrewRow> {
    const row: CrewRow = { id: this.nextId("crew"), ...input };
    this.snapshot.tables.crew.push(row);
    return { ...row };
  }
  async updateCrewIf(id: number, expect: Criteria<CrewRow>, patch: Partial<CrewRow>) {
    return this.conditionalUpdate("crew", id, expect, patch);
  }

  // ---- 备件库存 ----
  async findParts() {
    return [...this.snapshot.tables.sparePart];
  }
  async findPartByCode(partCode: string) {
    return this.snapshot.tables.sparePart.find((row) => row.part_code === partCode) ?? null;
  }
  async upsertPart(input: Omit<SparePartRow, "id">): Promise<SparePartRow> {
    const existing = this.snapshot.tables.sparePart.find((row) => row.part_code === input.part_code);
    if (existing) {
      Object.assign(existing, input);
      return { ...existing };
    }
    const row: SparePartRow = { id: this.nextId("sparePart"), ...input };
    this.snapshot.tables.sparePart.push(row);
    return { ...row };
  }
  async reserveStock(partCode: string, quantity: number): Promise<UpdateOutcome<SparePartRow>> {
    const part = this.snapshot.tables.sparePart.find((row) => row.part_code === partCode);
    if (!part || part.stock_quantity < quantity) {
      return { affected: 0, row: part ? { ...part } : null };
    }
    part.stock_quantity -= quantity;
    return { affected: 1, row: { ...part } };
  }
  async adjustStock(partCode: string, delta: number): Promise<SparePartRow> {
    const part = this.snapshot.tables.sparePart.find((row) => row.part_code === partCode);
    if (!part) throw new Error(`备件 ${partCode} 不存在`);
    part.stock_quantity += delta;
    return { ...part };
  }

  // ---- 备件领用 ----
  async findUsages(criteria?: Criteria<SparePartUsageRow>) {
    return this.snapshot.tables.sparePartUsage.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async insertUsage(input: Omit<SparePartUsageRow, "id" | "created_at">): Promise<SparePartUsageRow> {
    const row: SparePartUsageRow = { id: this.nextId("sparePartUsage"), created_at: nowDate(), ...input };
    this.snapshot.tables.sparePartUsage.push(row);
    return { ...row };
  }
  async updateUsageIf(id: number, expect: Criteria<SparePartUsageRow>, patch: Partial<SparePartUsageRow>) {
    return this.conditionalUpdate("sparePartUsage", id, expect, patch);
  }

  // ---- 库存流水 ----
  async findInventoryTransactions(criteria?: Criteria<InventoryTransactionRow>) {
    return this.snapshot.tables.inventoryTransaction
      .filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined))
      .sort((a, b) => Number(a.id) - Number(b.id));
  }
  async insertInventoryTransaction(input: Omit<InventoryTransactionRow, "id" | "created_at">): Promise<InventoryTransactionRow> {
    const row: InventoryTransactionRow = { id: this.nextId("inventoryTransaction"), created_at: nowDate(), ...input };
    this.snapshot.tables.inventoryTransaction.push(row);
    return { ...row };
  }

  // ---- 工单状态事件 ----
  async findTicketEventLogs(ticketId?: number) {
    return this.snapshot.tables.ticketEventLog
      .filter((row) => ticketId === undefined || row.ticket_id === ticketId)
      .sort((a, b) => Number(a.id) - Number(b.id));
  }
  async insertTicketEventLog(input: Omit<TicketEventLogRow, "id" | "created_at">): Promise<TicketEventLogRow> {
    const row: TicketEventLogRow = { id: this.nextId("ticketEventLog"), created_at: nowDate(), ...input };
    this.snapshot.tables.ticketEventLog.push(row);
    return { ...row };
  }

  // ---- 审计日志 ----
  async findAuditLogs(criteria?: Criteria<AuditLogRow>) {
    return this.snapshot.tables.auditLog.filter((row) => matchCriteria(row, criteria as Record<string, unknown> | undefined));
  }
  async insertAuditLog(input: Omit<AuditLogRow, "id" | "created_at">): Promise<AuditLogRow> {
    const row: AuditLogRow = { id: this.nextId("auditLog"), created_at: nowDate(), ...input };
    this.snapshot.tables.auditLog.push(row);
    return { ...row };
  }

  private conditionalUpdate<K extends keyof TableMap>(
    table: K,
    id: number,
    expect: Criteria<TableMap[K][number]>,
    patch: Partial<TableMap[K][number]>
  ): UpdateOutcome<TableMap[K][number]> {
    const rows = this.snapshot.tables[table] as unknown as Array<Record<string, unknown>>;
    const row = rows.find((item) => item.id === id);
    if (!row || !matchCriteria(row as never, expect as never)) {
      return { affected: 0, row: row ? ({ ...row } as never) : null };
    }
    Object.assign(row, patch);
    return { affected: 1, row: { ...row } as never };
  }
}
