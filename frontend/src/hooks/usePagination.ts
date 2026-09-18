import { computed, ref, type Ref } from "vue";

/** 通用分页 hook：页面列表与流水列表共用 */
export function usePagination<T>(rows: Ref<T[]> | T[], pageSizeValue = 8) {
  const source = computed<T[]>(() => (Array.isArray(rows) ? rows : rows.value));
  const page = ref(1);
  const pageSize = ref(pageSizeValue);
  const total = computed(() => source.value.length);
  const pageRows = computed(() =>
    source.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  );
  const reset = () => {
    page.value = 1;
  };
  return { page, pageSize, pageRows, total, reset };
}
