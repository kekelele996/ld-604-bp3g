<template><div class="empty-state"><span class="empty-icon">📭</span><p>{{ text }}</p><slot /></div></template>
<script setup lang="ts">
defineProps<{ text?: string }>();
</script>
