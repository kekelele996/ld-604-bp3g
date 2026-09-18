<script setup lang="ts">
import type { Crew } from "../../types/Crew";
import StatusBadge from "./StatusBadge.vue";

defineProps<{ crew: Crew; requiredFaultType?: string; selectable?: boolean }>();
defineEmits<{ (e: "select", crew: Crew): void }>();
</script>

<template>
  <div class="crew-card" :class="{ selectable, blocked: !crew.available }">
    <div class="crew-head">
      <strong>{{ crew.name }}</strong>
      <StatusBadge
        value="plain"
        :text="crew.dutyStatus === 'ON_DUTY' ? (crew.idle ? '值班·空闲' : '值班·占用') : '休班'"
      />
    </div>
    <div class="crew-skills">
      <span v-for="skill in crew.skillList" :key="skill" class="skill-chip" :class="{ hit: skill === requiredFaultType }">{{ skill }}</span>
    </div>
    <div class="crew-foot">
      <span v-if="crew.available" class="ok">可接单</span>
      <span v-else class="blocked-text">{{ crew.busyReason ?? "不可接单" }}</span>
      <span class="phone">{{ crew.contactPhone ?? "—" }}</span>
    </div>
    <button v-if="selectable && crew.available" class="btn btn-primary btn-sm" @click="$emit('select', crew)">派工给该班组</button>
  </div>
</template>
