import type { RequestHandler } from "express";

/**
 * 写操作请求体留痕：业务明细由 service 按 logTemplates 落 audit_log；
 * 此中间件只负责把写请求上下文（requestId、操作人）打印出来，供排障使用。
 */
export const auditLogMiddleware: RequestHandler = (req, _res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    console.info(
      `[audit-req] ${req.requestId} ${req.method} ${req.path} actor=${req.user?.username ?? "anonymous"} body=${JSON.stringify(req.body ?? {}).slice(0, 500)}`,
    );
  }
  next();
};
