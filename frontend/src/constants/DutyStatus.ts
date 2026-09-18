export const DutyStatus = ["ON_DUTY", "OFF_DUTY"] as const;
export type DutyStatus = (typeof DutyStatus)[number];

export const DutyStatusText: Record<DutyStatus, string> = {
  ON_DUTY: "值班",
  OFF_DUTY: "休班"
};
