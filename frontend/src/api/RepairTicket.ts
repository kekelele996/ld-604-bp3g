import { get, post } from "./http";
import type { DispatchPartLine, DispatchResult, RepairTicket, TicketEvent } from "../types/RepairTicket";
import type { TicketStatus } from "../constants/TicketStatus";

export const listRepairTickets = () => get<RepairTicket[]>("/repair-ticket");
export const getRepairTicket = (id: number) => get<RepairTicket>(`/repair-ticket/${id}`);
export const getTicketTimeline = (id: number) => get<TicketEvent[]>(`/repair-ticket/${id}/timeline`);

/** 故障报修 → 待派工工单 */
export const createTicketFromFault = (faultReportId: number) =>
  post<RepairTicket>("/repair-ticket/from-fault", { fault_report_id: faultReportId });

/** 派工 + 申请备件（后端单事务：库存不足整体不写入） */
export const dispatchTicket = (id: number, teamId: number, parts: DispatchPartLine[]) =>
  post<DispatchResult>(`/repair-ticket/${id}/dispatch`, { team_id: teamId, parts });

/** 状态推进：到场/抢修中/复电/关闭（后端校验状态机，重复点击只有一次成功） */
export const advanceTicket = (id: number, target: TicketStatus | "ARRIVED" | "REPAIRING" | "RESTORED", remark?: string) => {
  const path =
    target === "ARRIVED" ? "arrive" : target === "REPAIRING" ? "repair" : target === "RESTORED" ? "restore" : "close";
  return post<RepairTicket>(`/repair-ticket/${id}/${path}`, { remark });
};

export const closeTicket = (id: number, remark?: string) =>
  post<RepairTicket>(`/repair-ticket/${id}/close`, { remark });
