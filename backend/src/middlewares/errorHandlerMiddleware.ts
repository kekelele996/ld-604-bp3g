import type { ErrorRequestHandler } from "express";
import { BusinessError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";

/** 全局异常处理：保留 service/controller 包装出的错误码与 4xx 状态。 */
export const errorHandlerMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof BusinessError) {
    if (err.status >= 500) console.error(`[error] ${req.requestId}`, err);
    return res.status(err.status).json({
      code: err.code,
      message: err.message,
      detail: err.detail ?? null,
      requestId: req.requestId,
    });
  }

  // 例如 JSON body 解析错误等未预期异常
  console.error(`[error] ${req.requestId}`, err);
  const code = ERROR_CODES.INTERNAL_ERROR;
  return res.status(500).json({
    code,
    message: ERROR_MESSAGES[code],
    detail: process.env.NODE_ENV === "production" ? null : String((err as Error)?.message ?? err),
    requestId: req.requestId,
  });
};
