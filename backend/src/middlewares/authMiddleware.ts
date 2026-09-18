import type { RequestHandler } from "express";
import { authService } from "../services/AuthService";
import { BusinessError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";

const PUBLIC_PATHS = new Set(["/health", "/api/auth/login"]);

/**
 * JWT 认证：Authorization: Bearer <token>。
 * 健康检查与登录接口放行；开发期允许 X-Dev-User 指定种子用户快速联调。
 */
export const authMiddleware: RequestHandler = (req, _res, next) => {
  req.requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  if (req.path === "/health" || PUBLIC_PATHS.has(req.path)) {
    return next();
  }

  const devUser = req.header("x-dev-user");
  if (devUser && process.env.NODE_ENV !== "production") {
    req.user = {
      id: Number(req.header("x-dev-user-id") ?? 0) || 1,
      username: devUser,
      displayName: req.header("x-dev-display") ?? devUser,
      role: req.header("x-role") ?? "ADMIN",
    };
    return next();
  }

  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return next(new BusinessError(ERROR_CODES.AUTH_REQUIRED, undefined, 401));
  }
  try {
    const payload = authService.verify(token);
    req.user = { id: payload.sub, username: payload.username, displayName: payload.displayName, role: payload.role };
    return next();
  } catch (err) {
    return next(err);
  }
};
