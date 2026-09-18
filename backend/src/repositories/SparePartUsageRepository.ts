import { getDataGateway } from "../database/gatewayFactory";
import type { UnitOfWork, UpdateOutcome } from "../database/DataGateway";
import type { InventoryTransactionRow, SparePartRow, SparePartUsageRow } from "../database/types";

/** 备件 + 领用 + 库存流水数据访问层（库存类操作必须在事务内执行） */
export const sparePartUsageRepository = {
  // ---- 库存 ----
  findAllParts(uow?: UnitOfWork): Promise<SparePartRow[]> {
    return (uow ?? getDataGateway()).findParts();
  },
  upsertPart(row: Omit<SparePartRow, "id">, uow: UnitOfWork): Promise<SparePartRow> {
    return uow.upsertPart(row);
  },
  /** 原子条件扣减，库存不足 affected=0 */
  reserveStock(partCode: string, quantity: number, uow: UnitOfWork) {
    return uow.reserveStock(partCode, quantity);
  },
  returnStock(partCode: string, delta: number, uow: UnitOfWork): Promise<SparePartRow> {
    return uow.adjustStock(partCode, delta);
  },

  // ---- 领用记录 ----
  findAll(uow?: UnitOfWork): Promise<SparePartUsageRow[]> {
    return (uow ?? getDataGateway()).findUsages();
  },
  findByTicketId(ticketId: number, uow?: UnitOfWork): Promise<SparePartUsageRow[]> {
    return (uow ?? getDataGateway()).findUsages({ ticket_id: ticketId });
  },
  insert(row: Omit<SparePartUsageRow, "id" | "created_at">, uow: UnitOfWork): Promise<SparePartUsageRow> {
    return uow.insertUsage(row);
  },
  /** 仅当领用记录仍为 PENDING 时允许审批（重复审批只有一次 affected=1） */
  approveIfPending(id: number, approvedBy: number, uow: UnitOfWork): Promise<UpdateOutcome<SparePartUsageRow>> {
    return uow.updateUsageIf(
      id,
      { usage_status: "PENDING" },
      { usage_status: "APPROVED", approved_by: approvedBy, approved_at: new Date() }
    );
  },
  rejectIfPending(id: number, operatorId: number, uow: UnitOfWork): Promise<UpdateOutcome<SparePartUsageRow>> {
    return uow.updateUsageIf(
      id,
      { usage_status: "PENDING" },
      { usage_status: "REJECTED", approved_by: operatorId, approved_at: new Date() }
    );
  },

  // ---- 库存流水 ----
  findInventoryTransactions(partCode?: string, uow?: UnitOfWork): Promise<InventoryTransactionRow[]> {
    return (uow ?? getDataGateway()).findInventoryTransactions(partCode ? { part_code: partCode } : undefined);
  },
  insertInventoryTransaction(
    row: Omit<InventoryTransactionRow, "id" | "created_at">,
    uow: UnitOfWork
  ): Promise<InventoryTransactionRow> {
    return uow.insertInventoryTransaction(row);
  }
};
