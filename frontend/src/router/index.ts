import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { useAuthStore } from "../stores/authStore";

const routes: RouteRecordRaw[] = [
  { path: "/login", name: "login", component: () => import("../pages/LoginPage.vue"), meta: { public: true } },
  { path: "/", redirect: "/dashboard" },
  { path: "/dashboard", name: "dashboard", component: () => import("../pages/DashboardPage.vue"), meta: { title: "抢修态势" } },
  { path: "/assets", name: "assets", component: () => import("../pages/AssetsPage.vue"), meta: { title: "配网资产" } },
  { path: "/faults", name: "faults", component: () => import("../pages/FaultsPage.vue"), meta: { title: "故障报修" } },
  { path: "/tickets", name: "tickets", component: () => import("../pages/TicketsPage.vue"), meta: { title: "抢修工单" } },
  { path: "/parts", name: "parts", component: () => import("../pages/PartsPage.vue"), meta: { title: "备件领用" } },
  { path: "/:pathMatch(.*)*", redirect: "/dashboard" },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫：未登录跳登录页
router.beforeEach((to) => {
  const authStore = useAuthStore();
  if (!to.meta.public && !authStore.isLoggedIn) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.name === "login" && authStore.isLoggedIn) {
    return { name: "dashboard" };
  }
  return true;
});

/** 侧边栏导航复用（App.vue 与潜在面包屑共用）。 */
export const navItems = [
  { name: "抢修态势", route: "/dashboard" },
  { name: "配网资产", route: "/assets" },
  { name: "故障报修", route: "/faults" },
  { name: "抢修工单", route: "/tickets" },
  { name: "备件领用", route: "/parts" },
];
