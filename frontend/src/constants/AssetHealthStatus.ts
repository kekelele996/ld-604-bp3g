export const AssetHealthStatus = ["NORMAL", "WATCH", "DEGRADED", "DANGEROUS"] as const;
export type AssetHealthStatus = (typeof AssetHealthStatus)[number];

export const AssetHealthStatusText: Record<AssetHealthStatus, string> = {
  NORMAL: "正常",
  WATCH: "关注",
  DEGRADED: "降级",
  DANGEROUS: "危急"
};

export const AssetHealthStatusTagType: Record<AssetHealthStatus, "success" | "info" | "warning" | "danger"> = {
  NORMAL: "success",
  WATCH: "info",
  DEGRADED: "warning",
  DANGEROUS: "danger"
};
