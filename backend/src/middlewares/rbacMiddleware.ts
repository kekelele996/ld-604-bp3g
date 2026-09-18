import type { RequestHandler } from "express";
import { AppError } from "../utils/AppError";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import type { Role } from "../constants/Role";

/**
 * RBAC 中间件工厂：rbac(["DISPATCHER"])。
 * ADMIN 放行全部；GET 请求对所有已认证角色开放（台账查询）。
 */
export const rbacMiddleware =
  (roles: Role[] = []): RequestHandler =>
  (req, _res, next) => {
    const user = req.user;
    if (!user) {
      return next(new AppError(ERROR_CODES.AUTH_REQUIRED, ERROR_MESSAGES.AUTH_REQUIRED, 401));
    }
    if (req.method === "GET" || user.role === "ADMIN" || roles.includes(user.role)) {
      return next();
    }
    return next(new AppError(ERROR_CODES.RBAC_DENIED, ERROR_MESSAGES.RBAC_DENIED, 403));
  };
