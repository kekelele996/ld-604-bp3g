import { useAuthStore } from "../stores/AuthStore";

/**
 * 统一请求封装：前端统一请求 /api（由 nginx 反代到 backend:3000，
 * 本地 dev 由 vite proxy 转发），禁止硬编码 localhost。
 */

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: unknown;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = useAuthStore();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined)
  };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) {
    auth.clearSession();
  }
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const error: ApiError = {
      code: (body as { code?: string })?.code ?? "INTERNAL_ERROR",
      message: (body as { message?: string })?.message ?? `请求失败（${res.status}）`,
      status: res.status,
      details: (body as { details?: unknown })?.details
    };
    throw error;
  }
  return body as T;
}

export const get = <T>(path: string) => request<T>(path, { method: "GET" });
export const post = <T>(path: string, payload?: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(payload ?? {}) });
