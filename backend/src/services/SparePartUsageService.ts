import { getDataGateway } from "../database/gatewayFactory";
import { sparePartUsageRepository } from "../repositories/SparePartUsageRepository";
import { ticketEventLogRepository } from "../repositories/TicketEventLogRepository";
import { AppError } from "../utils/AppError";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES, renderMessage } from "../constants/errorMessages";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import type { ApproveUsagePayload } from "../types/SparePartUsagePayload";
import type { ActorContext } from "./RepairTicketService";
import {
  createSparePartListDto,
  createSparePartUsageListDto,
  createInventoryTransactionListDto
} from "../constructors/SparePartUsageDtoFactory";

/**
 * 备件服务：
 * - 备件申请在派工事务内完成（见 RepairTicketService.dispatch）；
 * - 审批使用 PENDING 条件更新，重复/并发审批只有一次成功；
 * - 驳回时把派工预留的库存回补，并写 REJECT_RETURN 流水，保证账实一致。
 */
export const sparePartUsageService = {
  listParts() {
    return sparePartUsageRepository.findAllParts().then(createSparePartListDto);
  },

  listUsages(ticketId?: number) {
    return ticketId
      ? sparePartUsageRepository.findByTicketId(ticketId).then(createSparePartUsageListDto)
      : sparePartUsageRepository.findAll().then(createSparePartUsageListDto);
  },

  listInventoryTransactions(partCode?: string) {
    return sparePartUsageRepository
      .findInventoryTransactions(partCode)
      .then(createInventoryTransactionListDto);
  },

  /** 审批领用记录：APPROVED 幂等占位；REJECTED 回补库存并记流水 */
  async reviewUsage(usageId: number, payload: ApproveUsagePayload, actor: ActorContext) {
    if (payload.decision !== "APPROVED" && payload.decision !== "REJECTED") {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, "decision 仅支持 APPROVED / REJECTED", 400);
    }
    const gateway = getDataGateway();
    return gateway.runInTransaction(async (uow) => {
      const usages = await uow.findUsages({ id: usageId });
      const usage = usages[0];
      if (!usage) throw AppError.notFound(ERROR_CODES.USAGE_NOT_FOUND, ERROR_MESSAGES.USAGE_NOT_FOUND);
      if (usage.usage_status !== "PENDING") {
        // 已被另一个请求审批/驳回：重复审批无效
        throw AppError.conflict(
          usage.usage_status === "APPROVED" ? ERROR_CODES.USAGE_ALREADY_APPROVED : ERROR_CODES.USAGE_NOT_PENDING,
          usage.usage_status === "APPROVED" ? ERROR_MESSAGES.USAGE_ALREADY_APPROVED : ERROR_MESSAGES.USAGE_NOT_PENDING
        );
      }

      if (payload.decision === "APPROVED") {
        const outcome = await sparePartUsageRepository.approveIfPending(usageId, actor.userId, uow);
        if (outcome.affected === 0) {
          // 并发审批竞争失败
          throw AppError.conflict(ERROR_CODES.USAGE_ALREADY_APPROVED, ERROR_MESSAGES.USAGE_ALREADY_APPROVED);
        }
        await uow.insertAuditLog({
          actor: actor.userName,
          action: "SparePartUsage.approve",
          target_type: "SparePartUsage",
          target_id: String(usageId),
          detail: renderMessage(LOG_TEMPLATES.SparePartUsage[1], { operatorId: actor.userId, id: usageId })
        });
        return createSparePartUsageListDto(await uow.findUsages({ id: usageId }))[0];
      }

      // REJECTED：条件置为驳回 + 回补库存 + 流水（同样只执行一次）
      const outcome = await sparePartUsageRepository.rejectIfPending(usageId, actor.userId, uow);
      if (outcome.affected === 0) {
        throw AppError.conflict(ERROR_CODES.USAGE_NOT_PENDING, ERROR_MESSAGES.USAGE_NOT_PENDING);
      }
      const part = await sparePartUsageRepository.returnStock(usage.part_code, usage.quantity, uow);
      await sparePartUsageRepository.insertInventoryTransaction(
        {
          part_code: usage.part_code,
          change_type: "REJECT_RETURN",
          quantity: usage.quantity,
          balance_after: part.stock_quantity,
          ticket_id: usage.ticket_id,
          usage_id: usageId,
          operator_id: actor.userId,
          remark: payload.remark ?? "领用驳回，库存回补"
        },
        uow
      );
      await ticketEventLogRepository.insert(
        {
          ticket_id: usage.ticket_id,
          from_status: null,
          to_status: "USAGE_REJECTED",
          operator_id: actor.userId,
          remark: `备件 ${usage.part_code} x${usage.quantity} 领用驳回，库存已回补`
        },
        uow
      );
      await uow.insertAuditLog({
        actor: actor.userName,
        action: "SparePartUsage.reject",
        target_type: "SparePartUsage",
        target_id: String(usageId),
        detail: renderMessage(LOG_TEMPLATES.SparePartUsage[2], {
          operatorId: actor.userId,
          id: usageId,
          quantity: usage.quantity
        })
      });
      return createSparePartUsageListDto(await uow.findUsages({ id: usageId }))[0];
    });
  }
};
