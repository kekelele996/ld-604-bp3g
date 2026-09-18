import { computed, ref, type Ref } from "vue";

/** 简单分页（本地切片），工单/备件列表共用。 */
export function usePagination<T>(rows: Ref<T[]>, pageSize = 8) {
  const page = ref(1);
  const totalPages = computed(() => Math.max(1, Math.ceil(rows.value.length / pageSize)));
  const pageRows = computed(() =>
    rows.value.slice((page.value - 1) * pageSize, page.value * pageSize),
  );

  function go(p: number) {
    page.value = Math.min(Math.max(1, p), totalPages.value);
  }

  return { page, pageSize, pageRows, total: computed(() => rows.value.length), totalPages, go };
}
