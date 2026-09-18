/** 班组值班状态：只有 ON_DUTY 班组允许接单 */
export const DutyStatus = ["ON_DUTY", "OFF_DUTY"] as const;
export type DutyStatus = (typeof DutyStatus)[number];

export const DutyStatusText: Record<DutyStatus, string> = {
  ON_DUTY: "值班",
  OFF_DUTY: "休班"
};
