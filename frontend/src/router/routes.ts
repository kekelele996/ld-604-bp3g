import type { RoleCode } from "../stores/AuthStore";

/**
 * 前端路由表（自定义轻量导航，未引入 vue-router）。
 * roles 表示允许访问的角色；空数组表示所有登录角色可见。
 * 真正的权限裁决在后端 RBAC 中间件，这里只做导航/页面显隐。
 */
export interface AppRoute {
  name: string;
  route: string;
  icon: string;
  roles: RoleCode[];
}

export const routes: AppRoute[] = [
  { name: "抢修态势", route: "/dashboard", icon: "DataAnalysis", roles: [] },
  { name: "配网资产", route: "/assets", icon: "Grid", roles: [] },
  { name: "故障报修", route: "/faults", icon: "Warning", roles: ["DISPATCHER", "CREW_LEADER"] },
  { name: "抢修工单", route: "/tickets", icon: "Tickets", roles: ["DISPATCHER", "CREW_LEADER"] },
  { name: "备件领用", route: "/parts", icon: "Box", roles: ["WAREHOUSE", "AUDITOR", "DISPATCHER"] }
];

/** 路由守卫：未登录拦截到登录页；角色不符拦截（store 与组件按钮显隐共用同一规则） */
export function canAccess(route: AppRoute, role: RoleCode | null): boolean {
  if (!role) return false;
  if (role === "ADMIN") return true;
  return route.roles.length === 0 || route.roles.includes(role);
}
