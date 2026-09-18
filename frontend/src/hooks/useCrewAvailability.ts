import { computed, type Ref } from "vue";
import type { Crew } from "../types/Crew";
import { SEVERITY_SKILL_RULE, type Severity } from "../constants/Severity";

/**
 * 班组可用性 hook（派工面板与 Dashboard 共用）：
 * 只有“值班 + 空闲 + 技能覆盖故障严重度”的班组可以接单。
 */
export function useCrewAvailability(crews: Ref<Crew[]> | Crew[], severity?: Ref<Severity | undefined> | Severity) {
  const all = computed<Crew[]>(() => (Array.isArray(crews) ? crews : crews.value));

  /** 技能是否覆盖严重度 */
  const covers = (crew: Crew, level: Severity): boolean => {
    const required = SEVERITY_SKILL_RULE[level] ?? [];
    if (required.length === 0) return true;
    return required.some((tag) => crew.skill_tags.includes(tag));
  };

  const availableCrews = computed<Crew[]>(() => {
    const level = typeof severity === "object" && severity !== null && "value" in severity
      ? (severity as Ref<Severity | undefined>).value
      : (severity as Severity | undefined);
    return all.value.filter((crew) => {
      if (!crew.available) return false;
      return level ? covers(crew, level) : true;
    });
  });

  /** 给出每个班组不可接单的原因（按钮禁用 + tooltip 共用） */
  const unavailableReason = (crew: Crew, level?: Severity): string => {
    if (crew.duty_status !== "ON_DUTY") return "班组休班中";
    if (crew.current_ticket_id !== null) return "班组正在执行其他工单";
    if (level && !covers(crew, level)) {
      const required = SEVERITY_SKILL_RULE[level] ?? [];
      return `技能不匹配（需 ${required.join("/")}）`;
    }
    return "";
  };

  return { availableCrews, unavailableReason, covers };
}
