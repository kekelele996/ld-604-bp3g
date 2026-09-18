<script setup lang="ts">
import { computed } from "vue";
import type { Crew } from "../../types/Crew";
import StatusBadge from "./StatusBadge.vue";
import { SkillTagText } from "../../constants/Severity";

/**
 * 班组卡片（派工面板、Dashboard 共用）：
 * 显示值班状态、占用情况与技能标签；不可接单时给出原因。
 */
const props = defineProps<{
  crew: Crew;
  /** 当前工单严重度，用于技能匹配判定 */
  severity?: string;
  disabledReason?: string;
  selectable?: boolean;
  selected?: boolean;
}>();

const emit = defineEmits<{ (e: "select", crew: Crew): void }>();

const skillText = computed(() =>
  props.crew.skill_tags.map((tag) => SkillTagText[tag] ?? tag).join(" / ")
);

const clickable = computed(() => props.selectable && !props.disabledReason);
</script>

<template>
  <div
    class="crew-card"
    :class="{ selectable: clickable, selected, dimmed: disabledReason }"
    @click="clickable && emit('select', crew)"
  >
    <div class="crew-head">
      <strong>{{ crew.name }}</strong>
      <StatusBadge :value="crew.duty_status" kind="duty" />
    </div>
    <div class="crew-line">
      <el-icon><User /></el-icon>
      <span>带班 {{ crew.leader_id }}</span>
      <el-divider direction="vertical" />
      <el-icon><Phone /></el-icon>
      <span>{{ crew.contact_phone }}</span>
    </div>
    <div class="crew-line skills">
      <el-tag v-for="tag in crew.skill_tags" :key="tag" size="small" type="info" effect="plain" class="skill-tag">
        {{ SkillTagText[tag] ?? tag }}
      </el-tag>
    </div>
    <div v-if="disabledReason" class="crew-reason">
      <el-icon><WarningFilled /></el-icon>{{ disabledReason }}
    </div>
    <div v-else-if="crew.available" class="crew-ok">
      <el-icon><CircleCheckFilled /></el-icon>值班空闲，可接单
    </div>
    <div v-if="$slots.default" class="crew-extra"><slot /></div>
    <span class="sr-only">{{ skillText }}</span>
  </div>
</template>

<style scoped>
.crew-card {
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  padding: 12px 14px;
  background: var(--el-bg-color);
  display: grid;
  gap: 8px;
  transition: all 0.15s;
}
.crew-card.selectable { cursor: pointer; }
.crew-card.selectable:hover { border-color: var(--el-color-primary); box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15); }
.crew-card.selected { border-color: var(--el-color-primary); border-width: 2px; padding: 11px 13px; }
.crew-card.dimmed { opacity: 0.62; }
.crew-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.crew-line { display: flex; align-items: center; gap: 6px; color: var(--el-text-color-secondary); font-size: 13px; flex-wrap: wrap; }
.skill-tag { margin-right: 4px; }
.crew-reason { color: var(--el-color-danger); font-size: 12px; display: flex; align-items: center; gap: 4px; }
.crew-ok { color: var(--el-color-success); font-size: 12px; display: flex; align-items: center; gap: 4px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
