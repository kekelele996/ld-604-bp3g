import type { Request, Response } from "express";
import { sparePartUsageService } from "../services/SparePartUsageService";
import { sparePartService } from "../services/SparePartService";
import { BusinessError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { toSparePartUsageListDto } from "../constructors/SparePartUsageDtoFactory";

function currentUser(req: Request) {
  if (!req.user) throw new BusinessError(ERROR_CODES.AUTH_REQUIRED, undefined, 401);
  return req.user;
}

export const sparePartUsageController = {
  async list(req: Request, res: Response) {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const ticketId = req.query.ticketId != null ? Number(req.query.ticketId) : undefined;
    const rows = await sparePartUsageService.list(status, ticketId);
    res.json(toSparePartUsageListDto(rows));
  },

  /** 备件目录 */
  async listParts(_req: Request, res: Response) {
    res.json(await sparePartService.list());
  },

  /** 库存流水（重启后用于核对库存与流水一致性） */
  async listTransactions(req: Request, res: Response) {
    const partCode = typeof req.query.partCode === "string" ? req.query.partCode : undefined;
    res.json(await sparePartService.listTransactions(partCode));
  },

  /** 新增备件目录（仓管）。 */
  async createPart(req: Request, res: Response) {
    res.status(201).json(await sparePartService.create(req.body ?? {}, currentUser(req)));
  },

  /** 仓管审批通过：库存不足返回 409 且不落任何记录。 */
  async approve(req: Request, res: Response) {
    res.json(await sparePartUsageService.approve(Number(req.params.id), currentUser(req)));
  },

  /** 仓管驳回。body: { reason } */
  async reject(req: Request, res: Response) {
    const reason = req.body?.reason ? String(req.body.reason) : undefined;
    res.json(await sparePartUsageService.reject(Number(req.params.id), currentUser(req), reason));
  },

  /** 归还入库。body: { quantity? } */
  async returnPart(req: Request, res: Response) {
    const quantity = req.body?.quantity != null ? Number(req.body.quantity) : undefined;
    res.json(await sparePartUsageService.returnPart(Number(req.params.id), quantity, currentUser(req)));
  },
};
