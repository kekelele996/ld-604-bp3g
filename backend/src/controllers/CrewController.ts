import type { Request, Response } from "express";
import { crewService } from "../services/CrewService";
import { BusinessError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { toCrewDto } from "../constructors/CrewDtoFactory";

function currentUser(req: Request) {
  if (!req.user) throw new BusinessError(ERROR_CODES.AUTH_REQUIRED, undefined, 401);
  return req.user;
}

export const crewController = {
  async list(req: Request, res: Response) {
    // 传 faultType 时返回“对该故障可接单”的班组视图（值班/空闲/技能）
    const faultType = typeof req.query.faultType === "string" ? req.query.faultType : undefined;
    const rows = await crewService.list(faultType);
    res.json(rows.map((r) => ({ ...toCrewDto(r, faultType), busyReason: r.busy_reason })));
  },

  async detail(req: Request, res: Response) {
    const detail = await crewService.detail(Number(req.params.id));
    res.json(toCrewDto(detail));
  },

  async create(req: Request, res: Response) {
    const created = await crewService.create(req.body ?? {}, currentUser(req));
    res.status(201).json(toCrewDto(created));
  },

  /** 值班状态切换。body: { duty_status: ON_DUTY|OFF_DUTY } */
  async setDutyStatus(req: Request, res: Response) {
    res.json(await crewService.setDutyStatus(Number(req.params.id), String(req.body?.duty_status ?? ""), currentUser(req)));
  },
};
