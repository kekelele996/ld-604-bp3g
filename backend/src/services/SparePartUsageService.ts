import { withTransaction } from "../repositories/db";
import { sparePartUsageRepository } from "../repositories/SparePartUsageRepository";
import { sparePartRepository } from "../repositories/SparePartRepository";
import { inventoryTransactionRepository } from "../repositories/InventoryTransactionRepository";
import { writeAudit } from "./AuditService";
import { BusinessError, notFound } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { LOG_TEMPLATES, renderLogTemplate } from "../constants/logTemplates";
import type { AuthUser } from "../types/express";

async function audit(
  conn: Parameters<typeof writeAudit>[0]["conn"],
  user: AuthUser,
  tplKey: "approve" | "reject",
  vars: Record<string, string | number | undefined>,
  targetId: number,
) {
  const { action, message } = renderLogTemplate(LOG_TEMPLATES.SparePartUsage[tplKey], vars);
  await writeAudit({ conn, actor: user, action, targetType: "SparePartUsage", targetId, detail: message });
}

export const sparePartUsageService = {
  async list(status?: string, ticketId?: number) {
    return sparePartUsageRepository.findAll(status, ticketId);
  },

  /**
   * 仓管审批通过：事务内完成 占用申请行 -> 条件扣库存 -> 写流水。
   * 库存不足：申请保持 PENDING、库存与流水零改动，整体回滚并返回 409。
   * 重复审批：usage_status 已不是 PENDING，markApproved 返回 0，抛 PART_ALREADY_APPROVED。
   */
  async approve(usageId: number, user: AuthUser) {
    try {
      const result = await withTransaction(async (conn) => {
        const usage = await sparePartUsageRepository.lockById(conn, usageId);
        if (!usage) throw notFound("SparePartUsage", usageId);
        if (usage.usage_status !== "PENDING") {
          throw new BusinessError(
            usage.usage_status === "APPROVED" || usage.usage_status === "CONSUMED"
              ? ERROR_CODES.PART_ALREADY_APPROVED
              : ERROR_CODES.PART_NOT_PENDING,
            { usageId, usageStatus: usage.usage_status },
            409,
          );
        }

        const part = await sparePartRepository.findByCode(conn, usage.part_code);
        if (!part) throw new BusinessError(ERROR_CODES.PART_NOT_FOUND, { partCode: usage.part_code }, 404);
        if (part.stock < usage.quantity) {
          const { message } = renderLogTemplate(LOG_TEMPLATES.SparePartUsage.insufficient, {
            part_code: part.part_code,
            quantity: usage.quantity,
            stock: part.stock,
          });
          await writeAudit({ conn, actor: user, action: LOG_TEMPLATES.SparePartUsage.insufficient.action, targetType: "SparePart", targetId: part.part_code, detail: message, result: "FAILED" });
          throw new BusinessError(ERROR_CODES.PART_STOCK_INSUFFICIENT, {
            partCode: part.part_code,
            partName: part.part_name,
            requested: usage.quantity,
            stock: part.stock,
          }, 409);
        }

        // 先占用申请为 APPROVED（条件更新保证并发/重复审批只成功一次）
        const approved = await sparePartUsageRepository.markApproved(conn, usageId, user.id);
        if (approved !== 1) throw new BusinessError(ERROR_CODES.PART_ALREADY_APPROVED, { usageId }, 409);

        const decrement = await sparePartRepository.decrementIfEnough(conn, usage.part_code, usage.quantity);
        if (decrement.affectedRows !== 1 || decrement.balance == null) {
          throw new BusinessError(ERROR_CODES.PART_STOCK_INSUFFICIENT, { partCode: usage.part_code }, 409);
        }

        await inventoryTransactionRepository.append(conn, {
          part_code: usage.part_code,
          change_qty: -usage.quantity,
          balance_after: decrement.balance,
          tx_type: "OUTBOUND",
          usage_id: usageId,
          ticket_id: usage.ticket_id,
          operator_id: user.id,
          remark: `审批出库：申请#${usageId}`,
        });

        await audit(conn, user, "approve", {
          usage_id: usageId,
          part_code: usage.part_code,
          quantity: usage.quantity,
          balance_after: decrement.balance,
        }, usageId);

        return { balanceAfter: decrement.balance };
      });
      return { usageId, approved: true, ...result };
    } catch (err) {
      if (err instanceof BusinessError) {
        await writeAudit({
          actor: user,
          action: LOG_TEMPLATES.SparePartUsage.approve.action,
          targetType: "SparePartUsage",
          targetId: usageId,
          detail: `审批失败（未出库、未写流水）: ${err.message}`,
          result: "FAILED",
        }).catch(() => undefined);
      }
      throw err;
    }
  },

  /** 驳回：仅 PENDING 可驳回，不动库存。 */
  async reject(usageId: number, user: AuthUser, reason?: string) {
    await withTransaction(async (conn) => {
      const usage = await sparePartUsageRepository.lockById(conn, usageId);
      if (!usage) throw notFound("SparePartUsage", usageId);
      if (usage.usage_status !== "PENDING") {
        throw new BusinessError(ERROR_CODES.PART_NOT_PENDING, { usageId, usageStatus: usage.usage_status }, 409);
      }
      const rejected = await sparePartUsageRepository.markRejected(conn, usageId, user.id);
      if (rejected !== 1) throw new BusinessError(ERROR_CODES.PART_ALREADY_APPROVED, { usageId }, 409);
      await audit(conn, user, "reject", {
        usage_id: usageId,
        part_code: usage.part_code,
        quantity: usage.quantity,
        reason: reason || "无",
      }, usageId);
    });
    return { usageId, approved: false };
  },

  /**
   * 归还备件（工单关闭前未使用部分）：库存回补 + 入库流水，同一事务。
   */
  async returnPart(usageId: number, quantity: number | undefined, user: AuthUser) {
    await withTransaction(async (conn) => {
      const usage = await sparePartUsageRepository.lockById(conn, usageId);
      if (!usage) throw notFound("SparePartUsage", usageId);
      if (!["APPROVED", "CONSUMED"].includes(usage.usage_status)) {
        throw new BusinessError(ERROR_CODES.PART_NOT_PENDING, { usageId, usageStatus: usage.usage_status }, 409);
      }
      const qty = quantity ?? usage.quantity;
      if (!Number.isInteger(qty) || qty <= 0) {
        throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { quantity: qty });
      }
      const balance = await sparePartRepository.increment(conn, usage.part_code, qty);
      await sparePartUsageRepository.updateStatus(conn, usageId, "RETURNED");
      await inventoryTransactionRepository.append(conn, {
        part_code: usage.part_code,
        change_qty: qty,
        balance_after: balance,
        tx_type: "RETURN",
        usage_id: usageId,
        ticket_id: usage.ticket_id,
        operator_id: user.id,
        remark: `归还入库：申请#${usageId}`,
      });
      const { message } = renderLogTemplate(LOG_TEMPLATES.SparePartUsage.return, {
        part_code: usage.part_code,
        quantity: qty,
        ticket_id: usage.ticket_id,
        balance_after: balance,
      });
      await writeAudit({ conn, actor: user, action: LOG_TEMPLATES.SparePartUsage.return.action, targetType: "SparePartUsage", targetId: usageId, detail: message });
    });
    return { usageId, returned: true };
  },
};
