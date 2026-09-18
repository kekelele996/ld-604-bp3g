import { withTransaction } from "../repositories/db";
import { faultReportRepository } from "../repositories/FaultReportRepository";
import { repairTicketRepository } from "../repositories/RepairTicketRepository";
import { writeAudit } from "./AuditService";
import { BusinessError, notFound } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { FaultType } from "../constants/FaultType";
import { Severity } from "../constants/Severity";
import { LOG_TEMPLATES, renderLogTemplate } from "../constants/logTemplates";
import type { AuthUser } from "../types/express";
import type { FaultCreatePayload } from "../types/payloads";

async function audit(
  conn: Parameters<typeof writeAudit>[0]["conn"],
  user: AuthUser | undefined,
  tplKey: string,
  vars: Record<string, string | number | undefined>,
  targetId: number,
) {
  const { action, message } = renderLogTemplate(LOG_TEMPLATES.FaultReport[tplKey], vars);
  await writeAudit({ conn, actor: user ?? null, action, targetType: "FaultReport", targetId, detail: message });
}

export const faultReportService = {
  async list(status?: string, severity?: string) {
    return faultReportRepository.findAll(status, severity);
  },

  async detail(id: number) {
    const fault = await faultReportRepository.findById(id);
    if (!fault) throw notFound("FaultReport", id);
    return fault;
  },

  async create(payload: FaultCreatePayload, user?: AuthUser) {
    if (!payload.reporter_name || !payload.phone) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "reporter_name/phone" });
    }
    if (!FaultType.includes(payload.fault_type as (typeof FaultType)[number])) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "fault_type", value: payload.fault_type });
    }
    if (!Severity.includes(payload.severity as (typeof Severity)[number])) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "severity", value: payload.severity });
    }
    const faultId = await withTransaction(async (conn) => {
      const id = await faultReportRepository.create(conn, {
        reporter_name: payload.reporter_name!,
        phone: payload.phone!,
        asset_id: payload.asset_id ?? null,
        fault_type: payload.fault_type!,
        address_desc: payload.address_desc ?? null,
        severity: payload.severity!,
        report_channel: payload.report_channel ?? "HOTLINE",
      });
      await audit(conn, user, "create", {
        fault_id: id,
        fault_type: payload.fault_type!,
        severity: payload.severity!,
        phone: payload.phone!,
      }, id);
      return id;
    });
    return this.detail(faultId);
  },

  /** 重复报修合并：把 source 标记为 DUPLICATED 并指向 target。 */
  async merge(sourceId: number, targetId: number, user: AuthUser) {
    if (sourceId === targetId) throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { reason: "cannot merge self" });
    await withTransaction(async (conn) => {
      const [source, target] = await Promise.all([
        faultReportRepository.lockById(conn, sourceId),
        faultReportRepository.lockById(conn, targetId),
      ]);
      if (!source) throw notFound("FaultReport", sourceId);
      if (!target) throw notFound("FaultReport", targetId);
      if (source.ticket_id) {
        // 已生成工单的报修禁止再合并，否则会出现“报修已废弃但工单仍存在”的不一致
        throw new BusinessError(ERROR_CODES.DISPATCH_CONFLICT, { reason: "已生成工单的报修不能合并", ticketId: source.ticket_id }, 409);
      }
      if (target.status === "DUPLICATED") {
        throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { reason: "不能合并到另一条重复报修", targetId }, 409);
      }
      await faultReportRepository.markDuplicated(conn, sourceId, targetId);
      await audit(conn, user, "merge", { fault_id: sourceId, merged_into_id: targetId }, sourceId);
      return true;
    });
    return { sourceId, mergedInto: targetId };
  },

  /**
   * 由报修生成工单：一个报修只能生成一个工单。
   * uk_ticket_fault + 状态条件保证重复点击只有一次成功。
   */
  async createTicket(faultId: number, user: AuthUser) {
    const ticketId = await withTransaction(async (conn) => {
      const fault = await faultReportRepository.lockById(conn, faultId);
      if (!fault) throw notFound("FaultReport", faultId);
      if (fault.status === "DUPLICATED") {
        throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { reason: "重复报修不可生成工单", mergedInto: fault.merged_into_id }, 409);
      }
      if (fault.ticket_id) {
        throw new BusinessError(ERROR_CODES.DISPATCH_CONFLICT, { reason: "该报修已生成工单", ticketId: fault.ticket_id }, 409);
      }

      const severityRank: Record<string, string> = { CRITICAL: "P1", HIGH: "P2", MEDIUM: "P3", LOW: "P4" };
      const priority = severityRank[fault.severity] ?? "P3";
      const id = await repairTicketRepository.create(conn, faultId, priority);
      await faultReportRepository.markTicketCreated(conn, faultId, id);
      await audit(conn, user, "createTicket", { fault_id: faultId, ticket_id: id }, faultId);
      return id;
    });
    return { faultId, ticketId };
  },
};
