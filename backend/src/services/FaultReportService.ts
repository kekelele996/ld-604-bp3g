import { getDataGateway } from "../database/gatewayFactory";
import { faultReportRepository } from "../repositories/FaultReportRepository";
import { AppError } from "../utils/AppError";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES, renderMessage } from "../constants/errorMessages";
import { LOG_TEMPLATES } from "../constants/logTemplates";
import { Severity } from "../constants/Severity";
import type { FaultReportRow } from "../database/types";
import type { ActorContext } from "./RepairTicketService";
import { createFaultReportDto, createFaultReportListDto } from "../constructors/FaultReportDtoFactory";

export interface CreateFaultReportInput {
  reporter_name: string;
  phone: string;
  asset_id?: number | null;
  fault_type: string;
  address_desc: string;
  severity: string;
  report_channel: string;
}

/** 故障报修登记、分级 */
export const faultReportService = {
  async list() {
    const rows = await faultReportRepository.findAll();
    return createFaultReportListDto(rows.sort((a, b) => b.id - a.id));
  },

  async register(input: CreateFaultReportInput, actor: ActorContext) {
    if (!input.reporter_name || !input.fault_type || !Severity.includes(input.severity as never)) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, ERROR_MESSAGES.VALIDATION_FAILED, 400);
    }
    const gateway = getDataGateway();
    return gateway.runInTransaction(async (uow) => {
      // 内存网关未暴露直写 fault_report 的入口，统一用 reseed 不合适；
      // 因此通过事务内表操作：insertFaultReport 在 UnitOfWork 中补齐
      const row = await uow.insertFaultReport({
        reporter_name: input.reporter_name,
        phone: input.phone,
        asset_id: input.asset_id ?? null,
        fault_type: input.fault_type,
        address_desc: input.address_desc,
        severity: input.severity,
        report_channel: input.report_channel,
        status: "RECEIVED"
      });
      await uow.insertAuditLog({
        actor: actor.userName,
        action: "FaultReport.create",
        target_type: "FaultReport",
        target_id: String(row.id),
        detail: renderMessage(LOG_TEMPLATES.FaultReport[0], { id: row.id, severity: row.severity })
      });
      return createFaultReportDto(row);
    });
  }
};

export type { FaultReportRow };
