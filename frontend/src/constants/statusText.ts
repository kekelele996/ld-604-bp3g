import { TicketStatusText } from "./TicketStatus";
import { SeverityText } from "./Severity";
import { UsageStatusText } from "./UsageStatus";
import { DutyStatusText } from "./DutyStatus";
import { FaultTypeText } from "./FaultType";
import { AssetHealthStatusText } from "./AssetHealthStatus";

/**
 * 状态文本集中映射（多页面共用）：
 * 工单状态、严重度、领用状态、值班状态、故障类型、资产健康度。
 */
export const STATUS_TEXT = {
  TicketStatus: TicketStatusText,
  Severity: SeverityText,
  UsageStatus: UsageStatusText,
  DutyStatus: DutyStatusText,
  FaultType: FaultTypeText,
  AssetHealthStatus: AssetHealthStatusText
} as const;
