import type { RequestHandler } from "express";
import { getDataGateway } from "../database/gatewayFactory";

/**
 * 审计中间件：所有写操作（POST）额外落一条“请求级”审计日志。
 * 业务事务内还会写“领域事件级”审计（派工/审批/状态推进），两者互补，
 * 即使请求体校验失败也能在 audit_log 中追溯调用动作。
 */
export const auditLogMiddleware: RequestHandler = (req, res, next) => {
  if (req.method !== "POST") return next();

  res.on("finish", () => {
    // 仅记录进入业务层的写请求（4xx/5xx 也记录，便于追溯越权与冲突）
    const actor = req.user ? `${req.user.name}#${req.user.id}` : "anonymous";
    void getDataGateway()
      .runInTransaction((uow) =>
        uow.insertAuditLog({
          actor,
          action: `HTTP ${req.method} ${req.path}`,
          target_type: "HttpRequest",
          target_id: null,
          detail: `status=${res.statusCode}`
        })
      )
      .catch(() => {
        // 审计失败不影响主流程（内存驱动退出阶段等极端场景）
      });
  });

  next();
};
