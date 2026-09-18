export interface TicketEvent {
  id: number;
  ticket_id: number;
  from_status: string | null;
  to_status: string;
  actor_id: number | null;
  actor_name: string | null;
  note: string | null;
  created_at?: string;
}
