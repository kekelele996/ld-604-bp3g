import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/AppError";

/**
 * 全局异常兜底：只负责统一响应格式，业务语义（code/status）由
 * service 抛 AppError、controller 再包一层产生，禁止在此吞掉错误。
 */
export const errorHandlerMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {})
    });
  }
  // 未知异常不向客户端泄漏堆栈
  console.error("[unhandled]", err);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "服务内部错误" });
};
