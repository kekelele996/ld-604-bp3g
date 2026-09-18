<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { routes, canAccess } from "./router/routes";
import { useAuthStore } from "./stores/AuthStore";
import { RoleText, type RoleCode } from "./constants/Role";
import LoginPage from "./pages/LoginPage.vue";
import DashboardPage from "./pages/DashboardPage.vue";
import AssetsPage from "./pages/AssetsPage.vue";
import FaultsPage from "./pages/FaultsPage.vue";
import TicketsPage from "./pages/TicketsPage.vue";
import PartsPage from "./pages/PartsPage.vue";

const auth = useAuthStore();
const active = ref<string>("/dashboard");

// 路由守卫：未登录或角色无权访问时回退到第一个可访问页面
const visibleRoutes = computed(() => routes.filter((r) => canAccess(r, auth.role)));
const currentRoute = computed(() => {
  const found = routes.find((r) => r.route === active.value);
  if (!found || !canAccess(found, auth.role)) return visibleRoutes.value[0];
  return found;
});

watch(
  visibleRoutes,
  (list) => {
    if (!list.some((r) => r.route === active.value)) active.value = list[0]?.route ?? "/dashboard";
  },
  { immediate: true }
);

const currentComponent = computed(() => {
  switch (currentRoute.value?.route) {
    case "/assets":
      return AssetsPage;
    case "/faults":
      return FaultsPage;
    case "/tickets":
      return TicketsPage;
    case "/parts":
      return PartsPage;
    default:
      return DashboardPage;
  }
});

const roleTagType: Record<RoleCode, "danger" | "warning" | "success" | "info" | "primary"> = {
  DISPATCHER: "danger",
  CREW_LEADER: "warning",
  WAREHOUSE: "success",
  AUDITOR: "info",
  ADMIN: "primary"
};

function logout() {
  auth.logout();
}
onMounted(() => void 0);
</script>

<template>
  <LoginPage v-if="!auth.isLoggedIn" @logged-in="active = '/dashboard'" />
  <div v-else class="shell">
    <aside>
      <div class="brand">
        <el-icon size="22"><Lightning /></el-icon>
        <span>电力配网抢修<br />工单系统</span>
      </div>
      <nav>
        <button
          v-for="route in visibleRoutes"
          :key="route.route"
          :class="{ active: currentRoute?.route === route.route }"
          @click="active = route.route"
        >
          <el-icon><component :is="route.icon" /></el-icon>
          {{ route.name }}
        </button>
      </nav>
      <div class="aside-foot">
        <el-tag :type="roleTagType[auth.role ?? 'ADMIN']" effect="dark" round>
          {{ auth.user ? RoleText[auth.user.role] : "" }}
        </el-tag>
        <div class="user-name">{{ auth.user?.name }}</div>
        <el-button link type="primary" @click="logout">退出登录</el-button>
      </div>
    </aside>
    <main class="page">
      <component :is="currentComponent" />
    </main>
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; display: grid; grid-template-columns: 232px 1fr; }
aside {
  background: linear-gradient(180deg, #1f3d2c, #274d38);
  color: #f5f1e6;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.brand { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 800; line-height: 1.3; margin-bottom: 18px; }
nav { display: grid; gap: 4px; flex: 1; }
nav button {
  border: 0;
  background: transparent;
  color: rgba(245, 241, 230, 0.78);
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
nav button.active,
nav button:hover { background: rgba(245, 241, 230, 0.14); color: #fff; }
.aside-foot { border-top: 1px solid rgba(245, 241, 230, 0.2); padding-top: 14px; display: grid; gap: 6px; justify-items: start; }
.user-name { font-size: 13px; opacity: 0.85; }
.page { padding: 24px 28px; background: #f4f6f2; overflow-x: auto; }
@media (max-width: 760px) {
  .shell { grid-template-columns: 1fr; }
  .page { padding: 16px; }
}
</style>
