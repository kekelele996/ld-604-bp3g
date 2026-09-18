/** 班组值班状态：只有 ON_DUTY 且当前无在手工单的班组才能接单 */
export const CrewDutyStatus = ["ON_DUTY", "OFF_DUTY"] as const;
export type CrewDutyStatus = (typeof CrewDutyStatus)[number];
