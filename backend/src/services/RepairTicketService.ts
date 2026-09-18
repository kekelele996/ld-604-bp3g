import { getDataGateway } from "../database/gatewayFactory";
import type { UnitOfWork } from "../database/DataGateway";
import { repairTicketRepository } from "../repositories/RepairTicketRepository";
import { faultReportRepository } from "../repositories/FaultReportRepository";
import { crewRepository } from "../repositories/CrewRepository";
import { sparePartUsageRepository } from "../repositories/SparePartUsageRepository";
import { ticketEventLogRepository } from "../repositories/TicketEventLogRepository";
import { AppError } from "../utils/AppError";
import { CrewEligibility } from "../utils/CrewEligibility";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES, severityMessage, stockMessage, renderMessage } from "../constants/errorMessages";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import { TICKET_STATUS_FLOW, TicketStatusText, type TicketStatus } from "../constants/TicketStatus";
import type { Severity } from "../constants/Severity";
import type { DispatchPartLine } from "../types/RepairTicketPayload";
import {
  createRepairTicketDto,
  createRepairTicketListDto,
  type RepairTicketDto
} from "../constructors/RepairTicketDtoFactory";

export interface ActorContext {
  userId: number;
  userName: string;
}

export interface DispatchResult {
  ticket: RepairTicketDto;
  usages: Array<{ id: number; part_code: string; quantity: number; usage_status: string }>;
}

/**
 * 抢修工单核心闭环：
 * 1. createFromFaultReport  故障报修 → 待派工工单
 * 2. dispatch               派工 + 申请备件（单一事务，库存不足整体不写入）
 * 3. advanceStatus         到场/抢修中/复电
 * 4. close                  关闭并释放班组
 */
export const repairTicketService = {
  // ---------------------------------------------------------------- 列表/详情
  async list() {
    const rows = await repairTicketRepository.findAll();
    return createRepairTicketListDto(rows.sort((a, b) => b.id - a.id));
  },

  async detail(id: number) {
    const row = await repairTicketRepository.findById(id);
    if (!row) throw AppError.notFound(ERROR_CODES.TICKET_NOT_FOUND, ERROR_MESSAGES.TICKET_NOT_FOUND);
    return createRepairTicketDto(row);
  },

  async timeline(id: number) {
    const ticket = await repairTicketRepository.findById(id);
    if (!ticket) throw AppError.notFound(ERROR_CODES.TICKET_NOT_FOUND, ERROR_MESSAGES.TICKET_NOT_FOUND);
    return ticketEventLogRepository.findByTicketId(id);
  },

  // ---------------------------------------------------- 故障报修 → 待派工工单
  async createFromFaultReport(faultReportId: number): Promise<RepairTicketDto> {
    const gateway = getDataGateway();
    return gateway.runInTransaction(async (uow) => {
      const fault = await faultReportRepository.findById(faultReportId, uow);
      if (!fault) {
        throw AppError.notFound(ERROR_CODES.FAULT_REPORT_NOT_FOUND, ERROR_MESSAGES.FAULT_REPORT_NOT_FOUND);
      }
      // fault_report_id 唯一约束 + 前置查重，防止重复生成
      const existing = await repairTicketRepository.findByFaultReportId(faultReportId, uow);
      if (existing) throw AppError.conflict(ERROR_CODES.FAULT_ALREADY_CONVERTED, ERROR_MESSAGES.FAULT_ALREADY_CONVERTED);

      const ticket = await repairTicketRepository.insert(
        {
          fault_report_id: fault.id,
          team_id: null,
          dispatcher_id: null,
          priority: fault.severity as Severity,
          status: "WAIT_DISPATCH",
          assigned_at: null,
          arrived_at: null,
          repairing_at: null,
          restored_at: null,
          closed_at: null
        },
        uow
      );
      await faultReportRepository.markConverted(fault.id, uow);
      await ticketEventLogRepository.insert(
        { ticket_id: ticket.id, from_status: null, to_status: "WAIT_DISPATCH", operator_id: null, remark: "故障报修生成工单" },
        uow
      );
      await uow.insertAuditLog({
        actor: "system",
        action: "RepairTicket.create",
        target_type: "RepairTicket",
        target_id: String(ticket.id),
        detail: renderMessage(LOG_TEMPLATES.RepairTicket[0], { id: ticket.id })
      });
      return createRepairTicketDto(ticket);
    });
  },

  // ----------------------------- 派工 + 备件申请（闭环最关键的单一事务）
  async dispatch(
    ticketId: number,
    teamId: number,
    parts: DispatchPartLine[],
    actor: ActorContext
  ): Promise<DispatchResult> {
    const gateway = getDataGateway();
    return gateway.runInTransaction(async (uow) => {
      // 1) 工单必须处于待派工
      const ticket = await repairTicketRepository.findById(ticketId, uow);
      if (!ticket) throw AppError.notFound(ERROR_CODES.TICKET_NOT_FOUND, ERROR_MESSAGES.TICKET_NOT_FOUND);
      if (ticket.status !== "WAIT_DISPATCH") {
        // 并发派工的第二个事务会在这里/在条件更新处失败
        throw AppError.conflict(ERROR_CODES.TICKET_ALREADY_DISPATCHED, ERROR_MESSAGES.TICKET_ALREADY_DISPATCHED);
      }

      const fault = await faultReportRepository.findById(ticket.fault_report_id, uow);
      if (!fault) throw AppError.notFound(ERROR_CODES.FAULT_REPORT_NOT_FOUND, ERROR_MESSAGES.FAULT_REPORT_NOT_FOUND);
      const severity = fault.severity as Severity;

      // 2) 班组必须存在、值班、空闲、技能覆盖故障严重度
      const crew = await crewRepository.findById(teamId, uow);
      if (!crew) throw AppError.notFound(ERROR_CODES.CREW_NOT_FOUND, ERROR_MESSAGES.CREW_NOT_FOUND);
      if (crew.duty_status !== "ON_DUTY") {
        throw new AppError(ERROR_CODES.CREW_OFF_DUTY, ERROR_MESSAGES.CREW_OFF_DUTY, 409);
      }
      if (crew.current_ticket_id !== null) {
        throw new AppError(ERROR_CODES.CREW_BUSY, ERROR_MESSAGES.CREW_BUSY, 409);
      }
      if (!CrewEligibility.coversSeverity(crew.skill_tags, severity)) {
        throw new AppError(ERROR_CODES.CREW_SKILL_MISMATCH, severityMessage(severity), 422, {
          required_skills: CrewEligibility.requiredSkills(severity)
        });
      }

      // 3) 先校验全部备件库存：任一不足都在写库前抛错 → 整笔回滚，无任何残留
      const normalizedParts = normalizePartLines(parts);
      for (const line of normalizedParts) {
        const part = await uow.findPartByCode(line.part_code);
        if (!part) {
          throw AppError.notFound(
            ERROR_CODES.PART_NOT_FOUND,
            renderMessage(ERROR_MESSAGES.PART_NOT_FOUND, { partCode: line.part_code })
          );
        }
        if (part.stock_quantity < line.quantity) {
          throw AppError.conflict(
            ERROR_CODES.PART_STOCK_INSUFFICIENT,
            stockMessage(line.part_code, line.quantity, part.stock_quantity)
          );
        }
      }

      // 4) 条件式占位工单：WAIT_DISPATCH → ASSIGNED（并发派工只有一个事务 affected=1）
      const assignedAt = new Date();
      const ticketOutcome = await repairTicketRepository.dispatchIfWaiting(
        ticketId,
        {
          status: "ASSIGNED",
          team_id: teamId,
          dispatcher_id: actor.userId,
          priority: severity,
          assigned_at: assignedAt
        },
        uow
      );
      if (ticketOutcome.affected === 0) {
        throw AppError.conflict(ERROR_CODES.TICKET_ALREADY_DISPATCHED, ERROR_MESSAGES.TICKET_ALREADY_DISPATCHED);
      }

      // 5) 条件式占用班组：ON_DUTY + current_ticket_id IS NULL 才命中
      const crewOutcome = await crewRepository.occupyIfIdle(teamId, ticketId, uow);
      if (crewOutcome.affected === 0) {
        // 班组刚被别的工单抢走（或下班）→ 回滚整个派工
        throw new AppError(ERROR_CODES.CREW_BUSY, ERROR_MESSAGES.CREW_BUSY, 409);
      }

      // 6) 逐件原子扣减库存 + 写领用记录 + 写库存流水（与派工同事务，一损俱损）
      const usages: DispatchResult["usages"] = [];
      for (const line of normalizedParts) {
        const part = (await uow.findPartByCode(line.part_code))!;
        const reserve = await sparePartUsageRepository.reserveStock(line.part_code, line.quantity, uow);
        if (reserve.affected === 0) {
          // 理论上第 3 步已拦截；保留原子扣减兜底，杜绝与其他事务竞争时超卖
          throw AppError.conflict(
            ERROR_CODES.PART_STOCK_INSUFFICIENT,
            stockMessage(line.part_code, line.quantity, part.stock_quantity)
          );
        }
        const usage = await sparePartUsageRepository.insert(
          {
            ticket_id: ticketId,
            part_code: part.part_code,
            part_name: part.part_name,
            quantity: line.quantity,
            warehouse_name: line.warehouse_name ?? part.warehouse_name,
            usage_status: "PENDING",
            approved_by: null,
            approved_at: null
          },
          uow
        );
        await sparePartUsageRepository.insertInventoryTransaction(
          {
            part_code: part.part_code,
            change_type: "RESERVE",
            quantity: -line.quantity,
            balance_after: reserve.row!.stock_quantity,
            ticket_id: ticketId,
            usage_id: usage.id,
            operator_id: actor.userId,
            remark: `工单 #${ticketId} 派工预留`
          },
          uow
        );
        usages.push({ id: usage.id, part_code: usage.part_code, quantity: usage.quantity, usage_status: usage.usage_status });
      }

      // 7) 工单状态事件 + 审计日志
      await ticketEventLogRepository.insert(
        {
          ticket_id: ticketId,
          from_status: "WAIT_DISPATCH",
          to_status: "ASSIGNED",
          operator_id: actor.userId,
          remark: `派工给班组 #${teamId}，预留备件 ${normalizedParts.length} 项`
        },
        uow
      );
      await uow.insertAuditLog({
        actor: actor.userName,
        action: "RepairTicket.dispatch",
        target_type: "RepairTicket",
        target_id: String(ticketId),
        detail: renderMessage(LOG_TEMPLATES.RepairTicket[1], { id: ticketId, teamId, severity })
      });
      await uow.insertAuditLog({
        actor: actor.userName,
        action: "Crew.occupy",
        target_type: "Crew",
        target_id: String(teamId),
        detail: renderMessage(LOG_TEMPLATES.Crew[3], { id: teamId, ticketId })
      });

      return { ticket: createRepairTicketDto(ticketOutcome.row!), usages };
    });
  },

  // ------------------------------------------------- 状态推进（到场/抢修/复电）
  async advanceStatus(ticketId: number, target: TicketStatus, actor: ActorContext, remark?: string): Promise<RepairTicketDto> {
    return this.advanceInternal(ticketId, target, actor, remark, false);
  },

  /** 关闭工单：额外释放班组占用 */
  async close(ticketId: number, actor: ActorContext, remark?: string): Promise<RepairTicketDto> {
    return this.advanceInternal(ticketId, "CLOSED", actor, remark, true);
  },

  async advanceInternal(
    ticketId: number,
    target: TicketStatus,
    actor: ActorContext,
    remark: string | undefined,
    isClose: boolean
  ): Promise<RepairTicketDto> {
    const gateway = getDataGateway();
    return gateway.runInTransaction(async (uow) => {
      const ticket = await repairTicketRepository.findById(ticketId, uow);
      if (!ticket) throw AppError.notFound(ERROR_CODES.TICKET_NOT_FOUND, ERROR_MESSAGES.TICKET_NOT_FOUND);

      const current = ticket.status as TicketStatus;
      // 状态机：只允许 WAIT_DISPATCH→ASSIGNED→ARRIVED→REPAIRING→RESTORED→CLOSED
      if (TICKET_STATUS_FLOW[current] !== target) {
        throw new AppError(
          ERROR_CODES.TICKET_STATUS_FLOW_VIOLATION,
          `${ERROR_MESSAGES.TICKET_STATUS_FLOW_VIOLATION}（当前 ${TicketStatusText[current]} 不能推进到 ${TicketStatusText[target]}）`,
          409
        );
      }

      const patch = await buildAdvancePatch(target);
      // 带旧状态条件的原子更新：重复/并发点击只有一次 affected=1
      const outcome = await repairTicketRepository.advanceIf(ticketId, current, patch, uow);
      if (outcome.affected === 0) {
        throw AppError.conflict(ERROR_CODES.TICKET_STATUS_CONFLICT, ERROR_MESSAGES.TICKET_STATUS_CONFLICT);
      }

      if (isClose && outcome.row!.team_id !== null) {
        // 释放班组，供下一次派工接单
        await crewRepository.releaseIfHolding(outcome.row!.team_id, ticketId, uow);
        await uow.insertAuditLog({
          actor: actor.userName,
          action: "Crew.release",
          target_type: "Crew",
          target_id: String(outcome.row!.team_id),
          detail: renderMessage(LOG_TEMPLATES.Crew[4], { id: outcome.row!.team_id, ticketId })
        });
      }

      await ticketEventLogRepository.insert(
        { ticket_id: ticketId, from_status: current, to_status: target, operator_id: actor.userId, remark: remark ?? null },
        uow
      );
      await uow.insertAuditLog({
        actor: actor.userName,
        action: target === "CLOSED" ? "RepairTicket.close" : "RepairTicket.advance",
        target_type: "RepairTicket",
        target_id: String(ticketId),
        detail:
          target === "RESTORED"
            ? renderMessage(LOG_TEMPLATES.RepairTicket[3], { id: ticketId })
            : renderMessage(LOG_TEMPLATES.RepairTicket[2], { id: ticketId, from: current, to: target })
      });

      return createRepairTicketDto(outcome.row!);
    });
  }
};

/** 校验并规整备件申请行 */
interface NormalizedPartLine {
  part_code: string;
  quantity: number;
  warehouse_name?: string;
}

function normalizePartLines(parts: DispatchPartLine[]): NormalizedPartLine[] {
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, "派工必须至少申请一项备件", 400);
  }
  return parts.map((line) => {
    const part_code = String(line.part_code ?? "").trim();
    const quantity = Number(line.quantity);
    if (!part_code || !Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, ERROR_MESSAGES.VALIDATION_FAILED, 400, { line });
    }
    return { part_code, quantity, warehouse_name: line.warehouse_name };
  });
}

async function buildAdvancePatch(target: TicketStatus): Promise<Partial<import("../database/types").RepairTicketRow>> {
  const now = new Date();
  switch (target) {
    case "ARRIVED":
      return { status: target, arrived_at: now };
    case "REPAIRING":
      return { status: target, repairing_at: now };
    case "RESTORED":
      return { status: target, restored_at: now };
    case "CLOSED":
      return { status: target, closed_at: now };
    default:
      // ASSIGNED 只能通过派工到达，不允许手工推进
      throw new AppError(ERROR_CODES.TICKET_STATUS_FLOW_VIOLATION, ERROR_MESSAGES.TICKET_STATUS_FLOW_VIOLATION, 409);
  }
}
