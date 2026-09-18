import type { CrewRow } from "../database/types";

/** 抢修班组领域模型：ON_DUTY 且 current_ticket_id 为空才能接单 */
export type Crew = CrewRow;
