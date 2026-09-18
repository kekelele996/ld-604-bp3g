import type { TicketStatus } from "./TicketStatus";
import type { PartUsageStatus } from "./PartUsageStatus";
import type { AssetHealthStatus } from "./AssetHealthStatus";
import type { CrewDutyStatus } from "./CrewDutyStatus";
import type { Severity } from "./Severity";

export const TICKET_STATUS_TEXT: Record<TicketStatus, string> = {
  WAIT_DISPATCH: "待派工",
  ASSIGNED: "已派工",
  ARRIVED: "到场",
  REPAIRING: "抢修中",
  RESTORED: "复电",
  CLOSED: "关闭",
};

export const PART_USAGE_STATUS_TEXT: Record<PartUsageStatus, string> = {
  PENDING: "待审批",
  APPROVED: "已批准",
  REJECTED: "已驳回",
  CONSUMED: "已消耗",
  RETURNED: "已归还",
};

export const ASSET_HEALTH_TEXT: Record<AssetHealthStatus, string> = {
  NORMAL: "正常",
  WATCH: "关注",
  DEGRADED: "降级",
  DANGEROUS: "危急",
};

export const DUTY_STATUS_TEXT: Record<CrewDutyStatus, string> = {
  ON_DUTY: "值班",
  OFF_DUTY: "休班",
};

export const SEVERITY_TEXT: Record<Severity, string> = {
  CRITICAL: "特急",
  HIGH: "紧急",
  MEDIUM: "一般",
  LOW: "低",
};

export const FAULT_TYPE_TEXT: Record<string, string> = {
  OUTAGE: "停电",
  VOLTAGE_LOW: "电压偏低",
  TRIP: "开关跳闸",
  EQUIPMENT_DAMAGE: "设备损坏",
  SAFETY_RISK: "安全隐患",
};
