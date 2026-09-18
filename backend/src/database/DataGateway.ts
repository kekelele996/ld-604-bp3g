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
 * 条件式更新的过滤条件，全部为等值匹配。
 * 并发安全依赖数据库的“带 WHERE 条件的原子 UPDATE”：
 * UPDATE ... WHERE id=? AND status='WAIT_DISPATCH' 在 MySQL 行锁下只有一个事务成功。
 */
export type Criteria<T> = Partial<Record<keyof T, T[keyof T] | null>>;

export interface UpdateOutcome<T> {
  affected: number;
  row: T | null;
}

/**
 * 工作单元：一个事务内的全部数据操作。Service 层只依赖该接口，
 * 因此 Prisma（生产/MySQL）与 InMemory（本地/测试）适配器可无缝互换。
 */
export interface UnitOfWork {
  // 配网资产
  findAssets(criteria?: Criteria<GridAssetRow>): Promise<GridAssetRow[]>;
  findAssetById(id: number): Promise<GridAssetRow | null>;
  insertAsset(row: Omit<GridAssetRow, "id">): Promise<GridAssetRow>;

  // 故障报修
  findFaultReports(criteria?: Criteria<FaultReportRow>): Promise<FaultReportRow[]>;
  findFaultReportById(id: number): Promise<FaultReportRow | null>;
  insertFaultReport(row: Omit<FaultReportRow, "id">): Promise<FaultReportRow>;
  updateFaultReport(id: number, patch: Partial<FaultReportRow>): Promise<void>;

  // 抢修工单
  findTickets(criteria?: Criteria<RepairTicketRow>): Promise<RepairTicketRow[]>;
  findTicketById(id: number): Promise<RepairTicketRow | null>;
  findTicketByFaultReportId(faultReportId: number): Promise<RepairTicketRow | null>;
  insertTicket(row: Omit<RepairTicketRow, "id">): Promise<RepairTicketRow>;
  /** 仅当 expect 中的字段全部匹配当前行时更新，affected=0 表示并发竞争失败 */
  updateTicketIf(id: number, expect: Criteria<RepairTicketRow>, patch: Partial<RepairTicketRow>): Promise<UpdateOutcome<RepairTicketRow>>;

  // 抢修班组
  findCrews(criteria?: Criteria<CrewRow>): Promise<CrewRow[]>;
  findCrewById(id: number): Promise<CrewRow | null>;
  insertCrew(row: Omit<CrewRow, "id">): Promise<CrewRow>;
  updateCrewIf(id: number, expect: Criteria<CrewRow>, patch: Partial<CrewRow>): Promise<UpdateOutcome<CrewRow>>;

  // 备件库存
  findParts(): Promise<SparePartRow[]>;
  findPartByCode(partCode: string): Promise<SparePartRow | null>;
  upsertPart(row: Omit<SparePartRow, "id">): Promise<SparePartRow>;
  /**
   * 原子扣减：UPDATE spare_part SET stock_quantity = stock_quantity - ?
   *          WHERE part_code=? AND stock_quantity >= ?
   * 库存不足时 affected=0，调用方必须回滚整个事务。
   */
  reserveStock(partCode: string, quantity: number): Promise<UpdateOutcome<SparePartRow>>;
  /** 无条件回补/调整库存（驳回放回、手工调整），返回调整后余额 */
  adjustStock(partCode: string, delta: number): Promise<SparePartRow>;

  // 备件领用
  findUsages(criteria?: Criteria<SparePartUsageRow>): Promise<SparePartUsageRow[]>;
  insertUsage(row: Omit<SparePartUsageRow, "id" | "created_at">): Promise<SparePartUsageRow>;
  updateUsageIf(id: number, expect: Criteria<SparePartUsageRow>, patch: Partial<SparePartUsageRow>): Promise<UpdateOutcome<SparePartUsageRow>>;

  // 库存流水
  findInventoryTransactions(criteria?: Criteria<InventoryTransactionRow>): Promise<InventoryTransactionRow[]>;
  insertInventoryTransaction(row: Omit<InventoryTransactionRow, "id" | "created_at">): Promise<InventoryTransactionRow>;

  // 工单状态事件
  findTicketEventLogs(ticketId?: number): Promise<TicketEventLogRow[]>;
  insertTicketEventLog(row: Omit<TicketEventLogRow, "id" | "created_at">): Promise<TicketEventLogRow>;

  // 审计日志
  findAuditLogs(criteria?: Criteria<AuditLogRow>): Promise<AuditLogRow[]>;
  insertAuditLog(row: Omit<AuditLogRow, "id" | "created_at">): Promise<AuditLogRow>;
}

/**
 * 持久化网关：除 UnitOfWork 的查询能力外，提供事务边界。
 */
export interface DataGateway extends UnitOfWork {
  /**
   * 在单个数据库事务中执行 work；work 内抛出任何异常都会整体回滚
   * （派工写入、班组占用、领用记录、库存流水要么全部成功，要么全部不存在）。
   */
  runInTransaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T>;
  /** 幂等初始化：建表（内存适配器）或只做连通性检查（Prisma 由迁移建表） */
  ensureReady(): Promise<void>;
  /** 仅测试/种子使用的批量重置 */
  reset?(): Promise<void>;
}
