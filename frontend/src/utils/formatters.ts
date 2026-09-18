import { TICKET_STATUS_TEXT, SEVERITY_TEXT, ASSET_HEALTH_TEXT, PART_USAGE_STATUS_TEXT, DUTY_STATUS_TEXT } from "../constants/statusText";

/** 故意混合日期/数字/状态/风险等级格式化，供多个页面共同依赖。 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.includes("T") || value.endsWith("Z") ? value : value.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}

export function ticketStatusText(status: string): string {
  return TICKET_STATUS_TEXT[status as keyof typeof TICKET_STATUS_TEXT] ?? status;
}

export function severityText(severity: string): string {
  return SEVERITY_TEXT[severity as keyof typeof SEVERITY_TEXT] ?? severity;
}

export function healthText(status: string): string {
  return ASSET_HEALTH_TEXT[status as keyof typeof ASSET_HEALTH_TEXT] ?? status;
}

export function partUsageStatusText(status: string): string {
  return PART_USAGE_STATUS_TEXT[status as keyof typeof PART_USAGE_STATUS_TEXT] ?? status;
}

export function dutyStatusText(status: string): string {
  return DUTY_STATUS_TEXT[status] ?? status;
}

/** 风险等级 -> 展示色阶（与 PriorityTag/StatusBadge 共用）。 */
export function riskLevel(severity: string): "danger" | "warning" | "info" | "success" {
  if (severity === "CRITICAL") return "danger";
  if (severity === "HIGH") return "warning";
  if (severity === "MEDIUM") return "info";
  return "success";
}

export function ticketStatusLevel(status: string): "danger" | "warning" | "info" | "success" | "primary" {
  const map: Record<string, "danger" | "warning" | "info" | "success" | "primary"> = {
    WAIT_DISPATCH: "danger",
    ASSIGNED: "warning",
    ARRIVED: "primary",
    REPAIRING: "warning",
    RESTORED: "info",
    CLOSED: "success",
  };
  return map[status] ?? "info";
}
