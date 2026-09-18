import { useAuthStore } from "../stores/authStore";

export interface ApiError {
  code: string;
  message: string;
  detail?: unknown;
  requestId?: string;
  status: number;
}

/** 统一走 /api（经 nginx 反代到 backend:3000），禁止硬编码 host。 */
const BASE = "/api";

export async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authStore = useAuthStore();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (authStore.token) headers.set("Authorization", `Bearer ${authStore.token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw {
      code: "NETWORK_ERROR",
      message: "无法连接后端服务，请确认后端已启动",
      status: 0,
    } satisfies ApiError;
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const apiError: ApiError = {
      code: body?.code ?? "INTERNAL_ERROR",
      message: body?.message ?? `请求失败（${res.status}）`,
      detail: body?.detail,
      requestId: body?.requestId,
      status: res.status,
    };
    if (res.status === 401) authStore.clear();
    throw apiError;
  }
  return body as T;
}

export const get = <T>(path: string) => http<T>(path);
export const post = <T>(path: string, data?: unknown) =>
  http<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) });
export const patch = <T>(path: string, data?: unknown) =>
  http<T>(path, { method: "PATCH", body: data === undefined ? undefined : JSON.stringify(data) });
