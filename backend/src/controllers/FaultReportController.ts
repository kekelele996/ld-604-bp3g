import type { Request, Response } from "express";
import { faultReportService } from "../services/FaultReportService";
import { BusinessError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { toFaultReportDto, toFaultReportListDto } from "../constructors/FaultReportDtoFactory";

function currentUser(req: Request) {
  if (!req.user) throw new BusinessError(ERROR_CODES.AUTH_REQUIRED, undefined, 401);
  return req.user;
}

export const faultReportController = {
  async list(req: Request, res: Response) {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const severity = typeof req.query.severity === "string" ? req.query.severity : undefined;
    res.json(toFaultReportListDto(await faultReportService.list(status, severity)));
  },

  async detail(req: Request, res: Response) {
    res.json(toFaultReportDto(await faultReportService.detail(Number(req.params.id))));
  },

  async create(req: Request, res: Response) {
    const created = await faultReportService.create(req.body ?? {}, req.user ?? undefined);
    res.status(201).json(toFaultReportDto(created));
  },

  /** 重复报修合并。body: { targetId } */
  async merge(req: Request, res: Response) {
    const user = currentUser(req);
    const sourceId = Number(req.params.id);
    const targetId = Number(req.body?.targetId);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "targetId" });
    }
    res.json(await faultReportService.merge(sourceId, targetId, user));
  },

  /** 由报修生成待派工工单。 */
  async createTicket(req: Request, res: Response) {
    const user = currentUser(req);
    res.status(201).json(await faultReportService.createTicket(Number(req.params.id), user));
  },
};
