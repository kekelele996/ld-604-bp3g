import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { repairTicketService, type ActorContext } from "../services/RepairTicketService";
import { TicketStatus } from "../constants/TicketStatus";
import type { DispatchPartLine } from "../types/RepairTicketPayload";

function actorOf(req: Request): ActorContext {
  return { userId: req.user!.id, userName: req.user!.name };
}

/**
 * 抢修工单控制器：只做参数解析与响应包装，业务裁决全部在 service 事务内。
 */
export const repairTicketController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await repairTicketService.list());
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    res.json(await repairTicketService.detail(Number(req.params.id)));
  }),

  timeline: asyncHandler(async (req: Request, res: Response) => {
    res.json(await repairTicketService.timeline(Number(req.params.id)));
  }),

  /** 故障报修 → 待派工工单 */
  createFromFault: asyncHandler(async (req: Request, res: Response) => {
    const faultReportId = Number(req.body?.fault_report_id);
    if (!Number.isInteger(faultReportId)) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, ERROR_MESSAGES.VALIDATION_FAILED, 400);
    }
    const dto = await repairTicketService.createFromFaultReport(faultReportId);
    res.status(201).json(dto);
  }),

  /** 派工 + 备件申请（原子事务） */
  dispatch: asyncHandler(async (req: Request, res: Response) => {
    const ticketId = Number(req.params.id);
    const teamId = Number(req.body?.team_id);
    const parts = req.body?.parts as DispatchPartLine[] | undefined;
    if (!Number.isInteger(ticketId) || !Number.isInteger(teamId) || !Array.isArray(parts)) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, ERROR_MESSAGES.VALIDATION_FAILED, 400, {
        required: ["team_id", "parts[]"]
      });
    }
    const result = await repairTicketService.dispatch(ticketId, teamId, parts, actorOf(req));
    res.status(201).json(result);
  }),

  /** 到场 / 抢修中 / 复电 推进 */
  arrive: asyncHandler(async (req, res) => advanceAndRespond(req, res, "ARRIVED")),
  repair: asyncHandler(async (req, res) => advanceAndRespond(req, res, "REPAIRING")),
  restore: asyncHandler(async (req, res) => advanceAndRespond(req, res, "RESTORED")),
  close: asyncHandler(async (req, res) => {
    const dto = await repairTicketService.close(Number(req.params.id), actorOf(req), req.body?.remark);
    res.json(dto);
  })
};

async function advanceAndRespond(req: Request, res: Response, target: (typeof TicketStatus)[number]) {
  const dto = await repairTicketService.advanceStatus(Number(req.params.id), target, actorOf(req), req.body?.remark);
  res.json(dto);
}
