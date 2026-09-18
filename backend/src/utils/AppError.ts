import { ERROR_CODES } from "../constants/errorCodes";
import type { ErrorCode } from "../constants/errorCodes";

/**
 * 业务异常：service 与 controller 分别包装，
 * 不允许只在全局 errorHandler 中吞掉所有异常。
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static notFound(code: ErrorCode, message: string): AppError {
    return new AppError(code, message, 404);
  }

  static conflict(code: ErrorCode, message: string): AppError {
    // 并发竞争（重复派工/重复审批/库存不足）统一 409，前端据此提示刷新
    return new AppError(code, message, 409);
  }

  static forbidden(message: string = ERROR_CODES.RBAC_DENIED): AppError {
    return new AppError("RBAC_DENIED", message, 403);
  }
}
