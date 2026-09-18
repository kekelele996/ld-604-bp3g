<script setup lang="ts">
import type { TicketEvent } from "../../types/RepairTicket";
import { formatDateTime } from "../../utils/formatters";
import StatusBadge from "./StatusBadge.vue";

defineProps<{ events: TicketEvent[] }>();
</script>

<template>
  <ol class="timeline">
    <li v-for="ev in [...events].reverse()" :key="ev.id" class="timeline-item">
      <div class="timeline-dot" />
      <div class="timeline-body">
        <div class="timeline-head">
          <StatusBadge :value="ev.to_status" />
          <span class="timeline-actor">{{ ev.actor_name ?? "系统" }}</span>
          <time>{{ formatDateTime(ev.created_at) }}</time>
        </div>
        <p v-if="ev.note" class="timeline-note">{{ ev.note }}</p>
      </div>
    </li>
  </ol>
</template>
