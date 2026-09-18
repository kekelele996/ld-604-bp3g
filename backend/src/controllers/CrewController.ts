import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { crewService } from "../services/CrewService";
import type { ActorContext } from "../services/RepairTicketService";

export const crewController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await crewService.list());
  }),

  /** 值班状态切换 */
  toggleDuty: asyncHandler(async (req: Request, res: Response) => {
    const actor: ActorContext = { userId: req.user!.id, userName: req.user!.name };
    res.json(
      await crewService.toggleDuty(
        Number(req.params.id),
        req.body?.duty_status === "OFF_DUTY" ? "OFF_DUTY" : "ON_DUTY",
        actor
      )
    );
  })
};
