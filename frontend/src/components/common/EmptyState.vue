<template>
  <el-empty :description="text" :image-size="imageSize">
    <slot />
  </el-empty>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ text?: string; imageSize?: number }>(), {
  text: "暂无数据",
  imageSize: 90
});
</script>
