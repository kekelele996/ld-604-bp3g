import type { Request, Response } from "express";
import { repairTicketService } from "../services/RepairTicketService";
import { BusinessError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import type { TicketStatus } from "../constants/TicketStatus";
import { toRepairTicketDto, toRepairTicketListDto } from "../constructors/RepairTicketDtoFactory";

function currentUser(req: Request) {
  if (!req.user) throw new BusinessError(ERROR_CODES.AUTH_REQUIRED, undefined, 401);
  return req.user;
}

function getId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { id: req.params.id });
  return id;
}

export const repairTicketController = {
  async list(req: Request, res: Response) {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const rows = await repairTicketService.list(status);
    res.json(toRepairTicketListDto(rows));
  },

  async detail(req: Request, res: Response) {
    const detail = await repairTicketService.detail(getId(req));
    res.json({ ...toRepairTicketDto(detail), events: detail.events });
  },

  /** 派工：仅调度员。body: { teamId } */
  async dispatch(req: Request, res: Response) {
    const user = currentUser(req);
    const ticketId = getId(req);
    const teamId = Number(req.body?.teamId);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "teamId" });
    }
    const dispatched = await repairTicketService.dispatch(ticketId, teamId, user, req.requestId);
    res.status(200).json(toRepairTicketDto(dispatched));
  },

  /**
   * 派工并申请备件（原子）：任一备件库存不足，整次派工与占用全部不写入。
   * body: { teamId, parts: [{ partCode, quantity }] }
   */
  async dispatchWithParts(req: Request, res: Response) {
    const user = currentUser(req);
    const ticketId = getId(req);
    const teamId = Number(req.body?.teamId);
    const parts = req.body?.parts;
    if (!Number.isInteger(teamId) || teamId <= 0) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "teamId" });
    }
    if (!Array.isArray(parts)) {
      throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "parts" });
    }
    res.status(200).json(
      await repairTicketService.dispatchWithParts(
        ticketId,
        teamId,
        parts.map((p: { partCode: string; quantity: number }) => ({ partCode: String(p.partCode), quantity: Number(p.quantity) })),
        user,
      ),
    );
  },

  /** 接单后申请备件（仅生成待审批领用记录）。body: { partCode, quantity } */
  async applyPart(req: Request, res: Response) {
    const user = currentUser(req);
    const ticketId = getId(req);
    const partCode = String(req.body?.partCode ?? "").trim();
    const quantity = Number(req.body?.quantity);
    if (!partCode) throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "partCode" });
    res.status(201).json(await repairTicketService.applyPart(ticketId, partCode, quantity, user));
  },

  /** 状态推进。body: { status, note, version }，只允许相邻状态前进。 */
  async advance(req: Request, res: Response) {
    const user = currentUser(req);
    const ticketId = getId(req);
    const target = String(req.body?.status ?? "") as TicketStatus;
    const note = req.body?.note ? String(req.body.note) : undefined;
    const version = req.body?.version != null ? Number(req.body.version) : undefined;
    const advanced = await repairTicketService.advance(ticketId, target, user, note, version);
    res.json({ ...toRepairTicketDto(advanced), events: advanced.events });
  },
};
