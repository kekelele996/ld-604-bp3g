import { computed, ref, type Ref } from "vue";
import { listCrew } from "../api/Crew";
import type { Crew } from "../types/Crew";

/**
 * 班组可接单情况：按故障类型拉取，仅值班+空闲+技能匹配的班组 available=true。
 * 派工弹窗与态势页共用。
 */
export function useCrewAvailability(faultType: Ref<string | undefined>) {
  const crews = ref<Crew[]>([]);
  const loading = ref(false);
  const error = ref("");

  async function load() {
    loading.value = true;
    error.value = "";
    try {
      crews.value = await listCrew(faultType.value);
    } catch (e) {
      error.value = (e as { message?: string })?.message ?? "班组加载失败";
    } finally {
      loading.value = false;
    }
  }

  const availableCrews = computed(() => crews.value.filter((c) => c.available));
  const busyCrews = computed(() => crews.value.filter((c) => !c.available));

  return { crews, loading, error, availableCrews, busyCrews, load };
}
