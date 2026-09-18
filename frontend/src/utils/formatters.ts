export const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("zh-CN", { hour12: false });
};

export const formatStatus = (value: string): string => value.replace(/_/g, " ");

export const formatNumber = (value: number): string => new Intl.NumberFormat("zh-CN").format(value);

/** 风险/严重度等级（多页面共用） */
export const formatRisk = (value: string): string =>
  ({ LOW: "低", MEDIUM: "中", HIGH: "高", CRITICAL: "危急", MAJOR: "重大", MINOR: "一般", EXTREME: "极高" } as Record<string, string>)[value] ?? value;

/** 平均复电时长（分钟），输入毫秒差 */
export const formatDurationMinutes = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "—";
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
};
