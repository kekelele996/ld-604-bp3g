import { defineStore } from "pinia";

export interface AuthUserInfo {
  id: number;
  username: string;
  displayName: string;
  role: string;
  phone: string | null;
}

const TOKEN_KEY = "grid-repair-token";
const USER_KEY = "grid-repair-user";

function readUser(): AuthUserInfo | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUserInfo) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) ?? "",
    user: readUser() as AuthUserInfo | null,
  }),
  getters: {
    isLoggedIn: (s) => Boolean(s.token && s.user),
    role: (s) => s.user?.role ?? "",
  },
  actions: {
    setSession(token: string, user: AuthUserInfo) {
      this.token = token;
      this.user = user;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    clear() {
      this.token = "";
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});
