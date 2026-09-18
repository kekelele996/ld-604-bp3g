import type { PoolConnection } from "mysql2/promise";
import { withTransaction } from "../repositories/db";
import { repairTicketRepository, type TicketWithRelations } from "../repositories/RepairTicketRepository";
import { crewRepository } from "../repositories/CrewRepository";
import { faultReportRepository } from "../repositories/FaultReportRepository";
import { ticketEventRepository } from "../repositories/TicketEventRepository";
import { sparePartRepository } from "../repositories/SparePartRepository";
import { sparePartUsageRepository } from "../repositories/SparePartUsageRepository";
import { inventoryTransactionRepository } from "../repositories/InventoryTransactionRepository";
import { writeAudit } from "./AuditService";
import { BusinessError, notFound } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { TicketStatus, isTicketStatus } from "../constants/TicketStatus";
import { TICKET_TRANSITIONS, canTransition } from "../constants/TicketFlow";
import { SEVERITY_PRIORITY, type Severity } from "../constants/Severity";
import { LOG_TEMPLATES, renderLogTemplate } from "../constants/logTemplates";
import { durationMinutes } from "../utils/formatters";
import type { AuthUser } from "../types/express";

const TIMESTAMP_COLUMN: Partial<Record<TicketStatus, "arrived_at" | "repair_started_at" | "restored_at" | "closed_at">> = {
  ARRIVED: "arrived_at",
  REPAIRING: "repair_started_at",
  RESTORED: "restored_at",
  CLOSED: "closed_at",
};

/** 接单（到场）之后才允许申请备件。 */
const PART_APPLICABLE_STATUSES: TicketStatus[] = ["ARRIVED", "REPAIRING", "RESTORED"];

async function audit(
  conn: PoolConnection,
  user: AuthUser | undefined,
  tplEntity: keyof typeof LOG_TEMPLATES,
  tplKey: string,
  vars: Record<string, string | number | undefined>,
  targetType: string,
  targetId: string | number,
  requestId?: string,
) {
  const tpl = LOG_TEMPLATES[tplEntity][tplKey];
  const { action, message } = renderLogTemplate(tpl, vars);
  await writeAudit({ conn, actor: user ?? null, action, targetType, targetId, detail: message, requestId });
}

async function failAudit(
  user: AuthUser | undefined,
  action: string,
  targetType: string,
  targetId: string | number,
  detail: string,
) {
  // 业务事务回滚后，失败事件仍需可追溯（独立连接写入，不影响“业务数据零写入”语义）
  await writeAudit({ actor: user ?? null, action, targetType, targetId, detail, result: "FAILED" }).catch(() => undefined);
}

export const repairTicketService = {
  async list(status?: string) {
    if (status && !isTicketStatus(status)) throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { status });
    return repairTicketRepository.findAll(status);
  },

  async detail(id: number) {
    const ticket = await repairTicketRepository.findById(id);
    if (!ticket) throw notFound("RepairTicket", id);
    const events = await ticketEventRepository.findByTicketId(id);
    return { ...ticket, events };
  },

  /**
   * 派工：单个数据库事务内完成
   *  1. 锁定工单，必须为 WAIT_DISPATCH
   *  2. 锁定班组，校验 值班 + 空闲 + 技能匹配故障类型
   *  3. 按故障严重度映射优先级，条件更新工单（affectedRows 保证并发只有一次成功）
   *  4. 条件占用班组 current_ticket_id
   *  5. 写状态事件 + 审计日志
   */
  async dispatch(ticketId: number, teamId: number, user: AuthUser, requestId?: string): Promise<TicketWithRelations> {
    try {
      await withTransaction(async (conn) => {
        const ticket = await repairTicketRepository.lockById(conn, ticketId);
        if (!ticket) throw notFound("RepairTicket", ticketId);
        if (ticket.status !== "WAIT_DISPATCH") {
          throw new BusinessError(ERROR_CODES.TICKET_NOT_DISPATCHABLE, { currentStatus: ticket.status }, 409);
        }

        const fault = await faultReportRepository.lockById(conn, ticket.fault_report_id);
        if (!fault) throw notFound("FaultReport", ticket.fault_report_id);

        const locked = await crewRepository.lockForDispatch(conn, teamId, fault.fault_type);
        if (!locked) throw notFound("Crew", teamId);
        if (!locked.isOnDuty) throw new BusinessError(ERROR_CODES.CREW_NOT_ON_DUTY, { teamId }, 409);
        if (!locked.isIdle) throw new BusinessError(ERROR_CODES.CREW_BUSY, { teamId, currentTicketId: locked.crew.current_ticket_id }, 409);
        if (!locked.skillMatch) {
          throw new BusinessError(ERROR_CODES.CREW_SKILL_MISMATCH, { teamId, requiredSkill: fault.fault_type, skillTags: locked.crew.skill_tags }, 409);
        }

        const priority = SEVERITY_PRIORITY[fault.severity as Severity] ?? "P3";

        const ticketUpdated = await repairTicketRepository.markAssigned(conn, ticketId, teamId, user.id, priority);
        if (ticketUpdated !== 1) {
          // 并发派工：工单行锁释放后已被另一请求改为 ASSIGNED
          throw new BusinessError(ERROR_CODES.DISPATCH_CONFLICT, { ticketId }, 409);
        }
        const occupied = await crewRepository.occupyIfIdle(conn, teamId, ticketId);
        if (occupied !== 1) {
          // 并发派工给同一班组：班组刚被其他工单占用
          throw new BusinessError(ERROR_CODES.CREW_BUSY, { teamId }, 409);
        }

        await ticketEventRepository.append(conn, {
          ticket_id: ticketId,
          from_status: "WAIT_DISPATCH",
          to_status: "ASSIGNED",
          actor_id: user.id,
          actor_name: user.displayName,
          note: `派工至${locked.crew.name}`,
        });
        await audit(conn, user, "RepairTicket", "dispatch", {
          ticket_id: ticketId,
          team_name: locked.crew.name,
          skill_tags: locked.crew.skill_tags,
          priority,
        }, "RepairTicket", ticketId, requestId);
        await audit(conn, user, "Crew", "occupy", {
          team_name: locked.crew.name,
          ticket_id: ticketId,
        }, "Crew", teamId, requestId);
      });
    } catch (err) {
      if (err instanceof BusinessError) {
        await failAudit(user, LOG_TEMPLATES.RepairTicket.dispatch.action, "RepairTicket", ticketId,
          `${ERROR_CODES[err.code as keyof typeof ERROR_CODES] ?? err.code}: ${err.message}`);
      }
      throw err;
    }
    return this.detail(ticketId) as Promise<TicketWithRelations>;
  },

  /**
   * 工单状态单向推进：ASSIGNED->ARRIVED->REPAIRING->RESTORED->CLOSED。
   * 条件更新 + 行锁保证重复点击/并发推进仅一次成功；关闭时释放班组占用。
   */
  async advance(ticketId: number, target: TicketStatus, user: AuthUser, note?: string, expectedVersion?: number) {
    if (!isTicketStatus(target) || target === "WAIT_DISPATCH") {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { target });
    }
    try {
      await withTransaction(async (conn) => {
        const ticket = await repairTicketRepository.lockById(conn, ticketId);
        if (!ticket) throw notFound("RepairTicket", ticketId);
        const from = ticket.status as TicketStatus;
        if (from === target) {
          throw new BusinessError(ERROR_CODES.TICKET_INVALID_TRANSITION, { from, to: target, reason: "already-in-status" }, 409);
        }
        if (!canTransition(from, target)) {
          throw new BusinessError(ERROR_CODES.TICKET_INVALID_TRANSITION, { from, to: target, allowedNext: TICKET_TRANSITIONS[from] }, 409);
        }
        const affected = await repairTicketRepository.advanceStatus(
          conn, ticketId, from, target, TIMESTAMP_COLUMN[target]!, expectedVersion,
        );
        if (affected !== 1) {
          throw new BusinessError(ERROR_CODES.TICKET_VERSION_CONFLICT, { ticketId }, 409);
        }

        await ticketEventRepository.append(conn, {
          ticket_id: ticketId,
          from_status: from,
          to_status: target,
          actor_id: user.id,
          actor_name: user.displayName,
          note: note ?? null,
        });

        const tplKey = target === "CLOSED" ? "close" : target === "RESTORED" ? "restore" : "transition";
        const vars: Record<string, string | number | undefined> = {
          ticket_id: ticketId,
          from_status: from,
          to_status: target,
          actor: user.displayName,
        };
        if (target === "RESTORED") {
          // 复电耗时：派工 -> 复电
          const restored = new Date();
          vars.duration_minutes = durationMinutes(ticket.assigned_at, restored.toISOString()) ?? 0;
        }
        await audit(conn, user, "RepairTicket", tplKey, vars, "RepairTicket", ticketId);

        if (target === "CLOSED" && ticket.team_id) {
          await crewRepository.release(conn, ticket.team_id);
          const crew = await crewRepository.findById(ticket.team_id);
          await audit(conn, user, "Crew", "release", {
            team_name: crew?.name ?? String(ticket.team_id),
            ticket_id: ticketId,
          }, "Crew", ticket.team_id);
        }
      });
    } catch (err) {
      if (err instanceof BusinessError) {
        await failAudit(user, LOG_TEMPLATES.RepairTicket.transition.action, "RepairTicket", ticketId,
          `推进到 ${target} 失败: ${err.message}`);
      }
      throw err;
    }
    return this.detail(ticketId);
  },

  /** 接单后申请备件：仅生成 PENDING 领用记录，不动库存；审批时才出库。 */
  async applyPart(ticketId: number, partCode: string, quantity: number, user: AuthUser) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "quantity", quantity });
    }
    const usageId = await withTransaction(async (conn) => {
      const ticket = await repairTicketRepository.lockById(conn, ticketId);
      if (!ticket) throw notFound("RepairTicket", ticketId);
      if (!PART_APPLICABLE_STATUSES.includes(ticket.status as TicketStatus)) {
        throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { reason: "备件申请仅在到场后开放", status: ticket.status }, 409);
      }
      const part = await sparePartRepository.findByCode(conn, partCode);
      if (!part) throw new BusinessError(ERROR_CODES.PART_NOT_FOUND, { partCode }, 404);

      const id = await sparePartUsageRepository.create(conn, {
        ticket_id: ticketId,
        part_code: part.part_code,
        part_name: part.part_name,
        quantity,
        warehouse_name: part.warehouse_name,
        requested_by: user.id,
      });
      await audit(conn, user, "SparePartUsage", "apply", {
        ticket_id: ticketId,
        part_code: part.part_code,
        quantity,
        warehouse_name: part.warehouse_name,
      }, "SparePartUsage", id);
      return id;
    });
    return { usageId, ticketId, partCode, quantity, usageStatus: "PENDING" };
  },

  /**
   * 一步式“派工并领用备件”：整次派工、班组占用、领用记录、库存扣减、流水
   * 全部在同一事务。任何备件库存不足 → 抛 PART_STOCK_INSUFFICIENT 并整体回滚，
   * 数据库里不留下工单状态、班组占用、领用记录、库存流水的任何痕迹。
   */
  async dispatchWithParts(
    ticketId: number,
    teamId: number,
    parts: Array<{ partCode: string; quantity: number }>,
    user: AuthUser,
  ) {
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "parts" });
    }
    for (const p of parts) {
      if (!Number.isInteger(p.quantity) || p.quantity <= 0) {
        throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "quantity", partCode: p.partCode });
      }
    }
    try {
      const result = await withTransaction(async (conn) => {
        const ticket = await repairTicketRepository.lockById(conn, ticketId);
        if (!ticket) throw notFound("RepairTicket", ticketId);
        if (ticket.status !== "WAIT_DISPATCH") {
          throw new BusinessError(ERROR_CODES.TICKET_NOT_DISPATCHABLE, { currentStatus: ticket.status }, 409);
        }
        const fault = await faultReportRepository.lockById(conn, ticket.fault_report_id);
        if (!fault) throw notFound("FaultReport", ticket.fault_report_id);

        const locked = await crewRepository.lockForDispatch(conn, teamId, fault.fault_type);
        if (!locked) throw notFound("Crew", teamId);
        if (!locked.isOnDuty) throw new BusinessError(ERROR_CODES.CREW_NOT_ON_DUTY, { teamId }, 409);
        if (!locked.isIdle) throw new BusinessError(ERROR_CODES.CREW_BUSY, { teamId }, 409);
        if (!locked.skillMatch) throw new BusinessError(ERROR_CODES.CREW_SKILL_MISMATCH, { teamId, requiredSkill: fault.fault_type }, 409);

        const priority = SEVERITY_PRIORITY[fault.severity as Severity] ?? "P3";

        const ticketUpdated = await repairTicketRepository.markAssigned(conn, ticketId, teamId, user.id, priority);
        if (ticketUpdated !== 1) throw new BusinessError(ERROR_CODES.DISPATCH_CONFLICT, { ticketId }, 409);
        const occupied = await crewRepository.occupyIfIdle(conn, teamId, ticketId);
        if (occupied !== 1) throw new BusinessError(ERROR_CODES.CREW_BUSY, { teamId }, 409);

        await ticketEventRepository.append(conn, {
          ticket_id: ticketId,
          from_status: "WAIT_DISPATCH",
          to_status: "ASSIGNED",
          actor_id: user.id,
          actor_name: user.displayName,
          note: `派工并申请备件至${locked.crew.name}`,
        });

        const usages: Array<{ usageId: number; partCode: string; quantity: number; balanceAfter: number }> = [];
        for (const item of parts) {
          const part = await sparePartRepository.findByCode(conn, item.partCode);
          if (!part) throw new BusinessError(ERROR_CODES.PART_NOT_FOUND, { partCode: item.partCode }, 404);
          if (part.stock < item.quantity) {
            // 关键回滚点：抛错后 withTransaction rollback，派工/占用/领用全部不落库
            await audit(conn, user, "SparePartUsage", "insufficient", {
              part_code: part.part_code,
              quantity: item.quantity,
              stock: part.stock,
            }, "SparePart", part.part_code);
            throw new BusinessError(ERROR_CODES.PART_STOCK_INSUFFICIENT, {
              partCode: part.part_code,
              partName: part.part_name,
              requested: item.quantity,
              stock: part.stock,
            }, 409);
          }
          const usageId = await sparePartUsageRepository.create(conn, {
            ticket_id: ticketId,
            part_code: part.part_code,
            part_name: part.part_name,
            quantity: item.quantity,
            warehouse_name: part.warehouse_name,
            requested_by: user.id,
          });
          const decrement = await sparePartRepository.decrementIfEnough(conn, part.part_code, item.quantity);
          if (decrement.affectedRows !== 1 || decrement.balance == null) {
            throw new BusinessError(ERROR_CODES.PART_STOCK_INSUFFICIENT, { partCode: part.part_code }, 409);
          }
          await inventoryTransactionRepository.append(conn, {
            part_code: part.part_code,
            change_qty: -item.quantity,
            balance_after: decrement.balance,
            tx_type: "OUTBOUND",
            usage_id: usageId,
            ticket_id: ticketId,
            operator_id: user.id,
            remark: `派工即领用：工单#${ticketId}`,
          });
          const approved = await sparePartUsageRepository.markApproved(conn, usageId, user.id);
          if (approved !== 1) throw new BusinessError(ERROR_CODES.PART_ALREADY_APPROVED, { usageId }, 409);

          await audit(conn, user, "SparePartUsage", "approve", {
            usage_id: usageId,
            part_code: part.part_code,
            quantity: item.quantity,
            balance_after: decrement.balance,
          }, "SparePartUsage", usageId);

          usages.push({ usageId, partCode: part.part_code, quantity: item.quantity, balanceAfter: decrement.balance });
        }

        await audit(conn, user, "RepairTicket", "dispatch", {
          ticket_id: ticketId, team_name: locked.crew.name, skill_tags: locked.crew.skill_tags, priority,
        }, "RepairTicket", ticketId);
        await audit(conn, user, "Crew", "occupy", { team_name: locked.crew.name, ticket_id: ticketId }, "Crew", teamId);

        return { priority, usages };
      });
      return { ticketId, teamId, ...result };
    } catch (err) {
      if (err instanceof BusinessError) {
        await failAudit(user, LOG_TEMPLATES.RepairTicket.dispatch.action, "RepairTicket", ticketId,
          `派工并领用失败（整体回滚）: ${err.message}`);
      }
      throw err;
    }
  },
};
