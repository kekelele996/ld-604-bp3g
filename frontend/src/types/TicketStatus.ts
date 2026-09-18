/**
 * 工单状态类型统一收敛到 constants/TicketStatus；
 * 此文件保留为类型出口，避免历史引用失效（枚举前后端多模块重复定义）。
 */
export { TicketStatus, TicketStatusText, TICKET_STATUS_FLOW } from "../constants/TicketStatus";
export type { TicketStatus as TicketStatusCode } from "../constants/TicketStatus";
