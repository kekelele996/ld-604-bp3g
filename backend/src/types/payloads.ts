export interface DispatchPayload {
  ticketId?: number;
  teamId?: number;
}

export interface TicketTransitionPayload {
  version?: number;
  note?: string;
}

export interface FaultCreatePayload {
  reporter_name?: string;
  phone?: string;
  asset_id?: number | null;
  fault_type?: string;
  address_desc?: string;
  severity?: string;
  report_channel?: string;
}

export interface PartApplyPayload {
  ticketId?: number;
  partCode?: string;
  quantity?: number;
}

export interface PartApprovePayload {
  reason?: string;
}

export interface CrewDutyPayload {
  duty_status?: string;
}
