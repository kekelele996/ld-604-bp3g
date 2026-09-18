import type { RequestHandler } from "express";
import { config } from "../config/env";
import { BusinessError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";

interface Bucket {
  count: number;
  resetAt: number;
}

// 进程内固定窗口限流（单实例足够；重启计数清空不影响业务正确性）
const buckets = new Map<string, Bucket>();

function getClientKey(req: Parameters<RequestHandler>[0]): string {
  return `${req.ip ?? req.socket.remoteAddress ?? "unknown"}:${req.user?.id ?? "anon"}`;
}

export const rateLimitMiddleware: RequestHandler = (req, res, next) => {
  // 健康检查不计数
  if (req.path === "/health") return next();

  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const max = config.rateLimit.max;
  const key = getClientKey(req);
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  const remaining = Math.max(0, max - bucket.count);
  res.setHeader("X-RateLimit-Limit", String(max));
  res.setHeader("X-RateLimit-Remaining", String(remaining));

  if (bucket.count > max) {
    res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return next(new BusinessError(ERROR_CODES.RATE_LIMITED, { key }, 429));
  }
  next();
};

/** 测试用：清空计数。 */
export function resetRateLimitBuckets(): void {
  buckets.clear();
}
