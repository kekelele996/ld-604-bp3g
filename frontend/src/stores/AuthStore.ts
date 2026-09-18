import { defineStore } from "pinia";
import { post } from "../api/http";

export type RoleCode = "DISPATCHER" | "CREW_LEADER" | "WAREHOUSE" | "AUDITOR" | "ADMIN";

export interface SessionUser {
  id: number;
  name: string;
  role: RoleCode;
}

interface LoginResponse {
  token: string;
  user: SessionUser;
}

const TOKEN_KEY = "grid-repair.token";
const USER_KEY = "grid-repair.user";

/** 登录态：JWT 持久化到 localStorage，刷新/重启浏览器后仍保留 */
export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) ?? "",
    user: JSON.parse(localStorage.getItem(USER_KEY) ?? "null") as SessionUser | null
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token && state.user),
    role: (state): RoleCode | null => state.user?.role ?? null
  },
  actions: {
    async login(username: string) {
      const data = await post<LoginResponse>("/auth/login", { username, password: "grid-repair" });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    },
    clearSession() {
      this.token = "";
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    logout() {
      this.clearSession();
    },
    /** RBAC 按钮显隐：ADMIN 全部可见 */
    can(roles: RoleCode[]): boolean {
      if (!this.user) return false;
      return this.user.role === "ADMIN" || roles.includes(this.user.role);
    }
  }
});
