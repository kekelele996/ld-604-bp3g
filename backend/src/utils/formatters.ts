import { TICKET_STATUS_TEXT, PART_USAGE_STATUS_TEXT, SEVERITY_TEXT } from "../constants/statusText";

export const toAuditTarget = (type: string, id: string | number) => `${type}#${id}`;

export function formatDateTime(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const raw = typeof value === "string" ? value : "";
  const d = typeof value === "string" ? new Date(raw.replace(" ", "T") + (raw.endsWith("Z") ? "" : "Z")) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function durationMinutes(from: string | Date | null, to: string | Date | null): number | null {
  if (!from || !to) return null;
  const parse = (v: string | Date) =>
    typeof v === "string" ? new Date(String(v).replace(" ", "T") + "Z").getTime() : v.getTime();
  const a = parse(from);
  const b = parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 60000));
}

export function ticketStatusText(status: string): string {
  return TICKET_STATUS_TEXT[status as keyof typeof TICKET_STATUS_TEXT] ?? status;
}

export function partUsageStatusText(status: string): string {
  return PART_USAGE_STATUS_TEXT[status as keyof typeof PART_USAGE_STATUS_TEXT] ?? status;
}

export function severityText(severity: string): string {
  return SEVERITY_TEXT[severity as keyof typeof SEVERITY_TEXT] ?? severity;
}

/** 把逗号分隔的技能标签字符串解析成数组（同时容忍 JSON 数组写法）。 */
export function parseSkillTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      /* fall through to comma split */
    }
  }
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}
