<script setup lang="ts">
import { computed } from "vue";
import type { GridAsset } from "../../types/GridAsset";
import { healthText } from "../../utils/formatters";

const props = defineProps<{ assets: GridAsset[] }>();
defineEmits<{ (e: "select", asset: GridAsset): void }>();

/** 按馈线分组的资产树（线路 -> 资产）。 */
const groups = computed(() => {
  const map = new Map<string, GridAsset[]>();
  for (const a of props.assets) {
    const list = map.get(a.feederLine) ?? [];
    list.push(a);
    map.set(a.feederLine, list);
  }
  return [...map.entries()].map(([line, list]) => ({ line, list }));
});

const healthClass = (s: string) => `health-${s.toLowerCase()}`;
</script>

<template>
  <div class="asset-tree">
    <details v-for="g in groups" :key="g.line" open class="tree-group">
      <summary>
        <strong>{{ g.line }}</strong>
        <span class="tree-count">{{ g.list.length }}</span>
      </summary>
      <ul>
        <li v-for="a in g.list" :key="a.id" @click="$emit('select', a)">
          <span class="tree-code">{{ a.assetCode }}</span>
          <span class="tree-type">{{ a.assetType }}</span>
          <span class="tree-health" :class="healthClass(a.healthStatus)">{{ healthText(a.healthStatus) }}</span>
          <span v-if="a.openFaultCount" class="tree-fault">未复电 {{ a.openFaultCount }}</span>
        </li>
      </ul>
    </details>
  </div>
</template>
