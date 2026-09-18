import { get, post } from "./http";
import type { AuthUserInfo } from "../stores/authStore";

interface LoginResponse {
  token: string;
  user: AuthUserInfo;
}

export function login(username: string) {
  return post<LoginResponse>("/auth/login", { username });
}

export function fetchMe() {
  return get<{ user: AuthUserInfo | null }>("/auth/me");
}
