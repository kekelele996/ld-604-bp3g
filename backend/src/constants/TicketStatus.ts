export const TicketStatus = ["WAIT_DISPATCH", "ASSIGNED", "ARRIVED", "REPAIRING", "RESTORED", "CLOSED"] as const;
export type TicketStatus = (typeof TicketStatus)[number];

export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && (TicketStatus as readonly string[]).includes(value);
}
