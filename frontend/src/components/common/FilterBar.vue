<script setup lang="ts">
defineProps<{ label?: string; options: Array<{ value: string; label: string }>; modelValue: string }>();
defineEmits<{ (e: "update:modelValue", value: string): void }>();
</script>

<template>
  <label class="filter-bar-item">
    <span v-if="label" class="filter-label">{{ label }}</span>
    <select class="input input-sm" :value="modelValue" @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
      <option value="">全部</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </label>
</template>
