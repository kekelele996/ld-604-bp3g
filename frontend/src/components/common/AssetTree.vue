<script setup lang="ts">
import { computed, ref } from "vue";
import type { GridAsset } from "../../types/GridAsset";
import StatusBadge from "./StatusBadge.vue";
import EmptyState from "./EmptyState.vue";

/** 资产线路树（资产页使用，按馈线分组） */
const props = defineProps<{ assets: GridAsset[]; selectedId?: number | null }>();
const emit = defineEmits<{ (e: "select", asset: GridAsset): void }>();

interface TreeNode {
  line: string;
  children: GridAsset[];
}

const tree = computed<TreeNode[]>(() => {
  const map = new Map<string, GridAsset[]>();
  for (const asset of props.assets) {
    const list = map.get(asset.feeder_line) ?? [];
    list.push(asset);
    map.set(asset.feeder_line, list);
  }
  return Array.from(map, ([line, children]) => ({ line, children }));
});

const expanded = ref(true);
</script>

<template>
  <EmptyState v-if="tree.length === 0" text="暂无资产台账" />
  <div v-else class="asset-tree">
    <div v-for="node in tree" :key="node.line" class="tree-node">
      <div class="tree-line" @click="expanded = !expanded">
        <el-icon class="caret" :class="{ open: expanded }"><CaretRight /></el-icon>
        <el-icon><Connection /></el-icon>
        <strong>{{ node.line }}</strong>
        <el-tag size="small" round effect="plain">{{ node.children.length }}</el-tag>
      </div>
      <div v-show="expanded" class="tree-children">
        <div
          v-for="asset in node.children"
          :key="asset.id"
          class="tree-asset"
          :class="{ active: selectedId === asset.id }"
          @click="emit('select', asset)"
        >
          <el-icon><Grid /></el-icon>
          <span class="code">{{ asset.asset_code }}</span>
          <StatusBadge :value="asset.health_status" kind="health" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asset-tree { display: grid; gap: 6px; }
.tree-line { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
.tree-line:hover { background: var(--el-fill-color-light); }
.caret { transition: transform 0.15s; }
.caret.open { transform: rotate(90deg); }
.tree-children { padding-left: 26px; display: grid; gap: 4px; }
.tree-asset { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
.tree-asset:hover { background: var(--el-fill-color-light); }
.tree-asset.active { background: var(--el-color-primary-light-9); }
.code { font-family: monospace; }
</style>
