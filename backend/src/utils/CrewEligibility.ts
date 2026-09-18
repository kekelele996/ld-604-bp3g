import { SEVERITY_SKILL_RULE, type Severity } from "../constants/Severity";

/**
 * 派工资格规则（严重度 × 班组技能）。
 * crew.skill_tags 以逗号分隔，如 "HOT_LINE,CABLE"。
 */
export function parseSkillTags(skillTags: string): string[] {
  return skillTags
    .split(",")
    .map((tag) => tag.trim().toUpperCase())
    .filter(Boolean);
}

export class CrewEligibility {
  /** 班组技能是否覆盖故障严重度：MINOR 无技能门槛；其余需命中规则中任一技能 */
  static coversSeverity(skillTags: string, severity: Severity): boolean {
    const required = SEVERITY_SKILL_RULE[severity];
    if (required.length === 0) return true;
    const owned = parseSkillTags(skillTags);
    return required.some((tag) => owned.includes(tag));
  }

  /** 返回某严重度要求的技能标签（用于错误提示与前端派工面板） */
  static requiredSkills(severity: Severity): string[] {
    return [...SEVERITY_SKILL_RULE[severity]];
  }
}
