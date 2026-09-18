import type { RequestHandler } from "express";
import { BusinessError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { LOG_TEMPLATES, renderLogTemplate } from "../constants/logTemplates";
import { writeAudit } from "../services/AuditService";

/** RBAC：按角色白名单放行，拒绝时写审计日志（Auth.denied）。 */
export const rbacMiddleware =
  (roles: readonly string[] = []): RequestHandler =>
  (req, _res, next) => {
    if (roles.length === 0) return next();
    const role = req.user?.role;
    if (role === "ADMIN") return next();
    if (role && roles.includes(role)) return next();

    const { message } = renderLogTemplate(LOG_TEMPLATES.Auth.denied, { role: role ?? "ANONYMOUS", path: req.path });
    writeAudit({
      actor: req.user ?? null,
      action: LOG_TEMPLATES.Auth.denied.action,
      targetType: "Endpoint",
      targetId: req.path,
      detail: message,
      result: "FAILED",
      requestId: req.requestId,
    }).catch(() => undefined);

    next(new BusinessError(ERROR_CODES.RBAC_DENIED, { requiredRoles: roles, actualRole: role }, 403));
  };
