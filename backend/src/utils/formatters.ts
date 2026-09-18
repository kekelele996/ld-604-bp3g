/** 审计目标格式工具（审计日志中间件与 service 共用） */
export const toAuditTarget = (type: string, id: string | number): string => `${type}#${id}`;

/** ISO 时间字符串截断到秒，日志模板中使用 */
export const toIsoSecond = (value: Date | string | null | undefined): string => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString();
};
