import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { faultReportService } from "../services/FaultReportService";
import type { ActorContext } from "../services/RepairTicketService";

export const faultReportController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await faultReportService.list());
  }),

  register: asyncHandler(async (req: Request, res: Response) => {
    const actor: ActorContext = { userId: req.user!.id, userName: req.user!.name };
    const dto = await faultReportService.register(req.body, actor);
    res.status(201).json(dto);
  })
};
