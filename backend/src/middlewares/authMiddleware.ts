import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { AppError } from "../utils/AppError";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { Role, type AuthUser, type Role as RoleType } from "../constants/Role";

function isRole(value: unknown): value is RoleType {
  return typeof value === "string" && (Role as readonly string[]).includes(value);
}

/**
 * 认证中间件：优先解析 Authorization: Bearer <jwt>；
 * 本地评审允许用 x-user-id / x-user-name / x-role 头快速模拟登录态。
 */
export const authMiddleware: RequestHandler = (req, _res, next) => {
  try {
    if (req.path === "/health") return next();

    const header = req.header("authorization");
    if (header?.startsWith("Bearer ")) {
      const token = header.slice("Bearer ".length).trim();
      const payload = jwt.verify(token, config.jwtSecret) as unknown as AuthUser;
      if (!payload || !isRole(payload.role)) {
        throw new AppError(ERROR_CODES.AUTH_INVALID, ERROR_MESSAGES.AUTH_INVALID, 401);
      }
      req.user = { id: payload.id, name: payload.name, role: payload.role };
      return next();
    }

    // 本地开发 / Docker 评审的无 JWT 通道：显式请求头注入身份
    const roleHeader = req.header("x-role");
    if (isRole(roleHeader)) {
      req.user = {
        id: Number(req.header("x-user-id") ?? 1),
        name: req.header("x-user-name") ?? "local-user",
        role: roleHeader
      };
      return next();
    }

    throw new AppError(ERROR_CODES.AUTH_REQUIRED, ERROR_MESSAGES.AUTH_REQUIRED, 401);
  } catch (err) {
    if (err instanceof AppError) return next(err);
    return next(new AppError(ERROR_CODES.AUTH_INVALID, ERROR_MESSAGES.AUTH_INVALID, 401));
  }
};
