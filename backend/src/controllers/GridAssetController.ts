import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { gridAssetService } from "../services/GridAssetService";
import { createGridAssetListDto } from "../constructors/GridAssetDtoFactory";
import { AppError } from "../utils/AppError";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";

export const gridAssetController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json(createGridAssetListDto(await gridAssetService.list()));
  }),
  detail: asyncHandler(async (req: Request, res: Response) => {
    const row = await gridAssetService.detail(Number(req.params.id));
    if (!row) throw AppError.notFound(ERROR_CODES.TICKET_NOT_FOUND, ERROR_MESSAGES.TICKET_NOT_FOUND);
    res.json(row);
  })
};
