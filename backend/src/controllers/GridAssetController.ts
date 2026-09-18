import type { Request, Response } from "express";
import { gridAssetService } from "../services/GridAssetService";
import { BusinessError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { toGridAssetDto, toGridAssetListDto } from "../constructors/GridAssetDtoFactory";

function currentUser(req: Request) {
  if (!req.user) throw new BusinessError(ERROR_CODES.AUTH_REQUIRED, undefined, 401);
  return req.user;
}

export const gridAssetController = {
  async list(req: Request, res: Response) {
    const feederLine = typeof req.query.feederLine === "string" ? req.query.feederLine : undefined;
    const healthStatus = typeof req.query.healthStatus === "string" ? req.query.healthStatus : undefined;
    const rows = await gridAssetService.list(feederLine, healthStatus);
    res.json(toGridAssetListDto(rows));
  },

  async feederLines(_req: Request, res: Response) {
    res.json(await gridAssetService.listFeederLines());
  },

  async create(req: Request, res: Response) {
    const created = await gridAssetService.create(req.body ?? {}, currentUser(req));
    res.status(201).json(toGridAssetDto(created));
  },

  async updateHealthStatus(req: Request, res: Response) {
    const toStatus = String(req.body?.health_status ?? "");
    const updated = await gridAssetService.updateHealthStatus(Number(req.params.id), toStatus, currentUser(req));
    res.json(toGridAssetDto(updated));
  },
};
