import type { RequestHandler } from "express";
import { config } from "../config/env";
import { AppError } from "../utils/AppError";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";

/** 极简固定窗口限流：单实例足够；压测并发派工时窗口已默认放宽 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export const rateLimitMiddleware: RequestHandler = (req, res, next) => {
  if (req.path === "/health") return next();
  const key = `${req.ip ?? "unknown"}:${req.path}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.rateLimit.windowMs });
    res.setHeader("X-RateLimit-Limit", String(config.rateLimit.max));
    res.setHeader("X-RateLimit-Remaining", String(config.rateLimit.max - 1));
    return next();
  }
  if (bucket.count >= config.rateLimit.max) {
    res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    return next(new AppError(ERROR_CODES.RATE_LIMITED, ERROR_MESSAGES.RATE_LIMITED, 429));
  }
  bucket.count += 1;
  res.setHeader("X-RateLimit-Limit", String(config.rateLimit.max));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, config.rateLimit.max - bucket.count)));
  return next();
};
