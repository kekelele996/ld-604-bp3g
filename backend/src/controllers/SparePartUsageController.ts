import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { sparePartUsageService } from "../services/SparePartUsageService";
import type { ActorContext } from "../services/RepairTicketService";
import type { ApproveUsagePayload } from "../types/SparePartUsagePayload";

/** 备件库存、领用记录、库存流水 + 审批 */
export const sparePartUsageController = {
  listParts: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await sparePartUsageService.listParts());
  }),

  listUsages: asyncHandler(async (req: Request, res: Response) => {
    const ticketId = req.query.ticketId ? Number(req.query.ticketId) : undefined;
    res.json(await sparePartUsageService.listUsages(ticketId));
  }),

  listInventoryTransactions: asyncHandler(async (req: Request, res: Response) => {
    const partCode = typeof req.query.partCode === "string" ? req.query.partCode : undefined;
    res.json(await sparePartUsageService.listInventoryTransactions(partCode));
  }),

  /** 审批（APPROVED）或驳回（REJECTED）；重复审批只有一次成功 */
  review: asyncHandler(async (req: Request, res: Response) => {
    const usageId = Number(req.params.id);
    const decision = req.body?.decision as ApproveUsagePayload["decision"];
    if (!Number.isInteger(usageId) || (decision !== "APPROVED" && decision !== "REJECTED")) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, ERROR_MESSAGES.VALIDATION_FAILED, 400);
    }
    const actor: ActorContext = { userId: req.user!.id, userName: req.user!.name };
    res.status(200).json(
      await sparePartUsageService.reviewUsage(
        usageId,
        { decision, remark: req.body?.remark },
        actor
      )
    );
  })
};
