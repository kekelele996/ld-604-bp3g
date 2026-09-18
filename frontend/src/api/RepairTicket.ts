import { get, post } from "./http";
import type { RepairTicket } from "../types/RepairTicket";
import type { TicketStatus } from "../constants/TicketStatus";

export function listRepairTickets(status?: string) {
  return get<RepairTicket[]>(`/repair-ticket${status ? `?status=${encodeURIComponent(status)}` : ""}`);
}

export function getRepairTicket(id: number) {
  return get<RepairTicket>(`/repair-ticket/${id}`);
}

/** 调度员派工 */
export function dispatchTicket(ticketId: number, teamId: number) {
  return post<RepairTicket>(`/repair-ticket/${ticketId}/dispatch`, { teamId });
}

/** 派工同时领用备件（任一备件库存不足，整次派工全部回滚） */
export function dispatchWithParts(
  ticketId: number,
  teamId: number,
  parts: Array<{ partCode: string; quantity: number }>,
) {
  return post<{ ticketId: number; teamId: number; priority: string; usages: Array<{ usageId: number; partCode: string; quantity: number; balanceAfter: number }> }>(
    `/repair-ticket/${ticketId}/dispatch-with-parts`,
    { teamId, parts },
  );
}

/** 班组到场/抢修/复电/关闭推进 */
export function transitionTicket(ticketId: number, status: TicketStatus, note?: string, version?: number) {
  return post<RepairTicket>(`/repair-ticket/${ticketId}/transition`, { status, note, version });
}

/** 接单后申请备件 */
export function applyPart(ticketId: number, partCode: string, quantity: number) {
  return post<{ usageId: number; ticketId: number; partCode: string; quantity: number; usageStatus: string }>(
    `/repair-ticket/${ticketId}/parts`,
    { partCode, quantity },
  );
}
