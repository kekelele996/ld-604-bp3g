import { ERROR_CODES, type ErrorCode } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";

/** Service / Controller 共用业务异常，禁止在全局处吞掉错误码。 */
export class BusinessError extends Error {
  code: ErrorCode;
  status: number;
  detail?: unknown;

  constructor(code: ErrorCode, detail?: unknown, status?: number) {
    super(ERROR_MESSAGES[code]);
    this.name = "BusinessError";
    this.code = code;
    this.status = status ?? (code === ERROR_CODES.RBAC_DENIED ? 403 : code === ERROR_CODES.RATE_LIMITED ? 429 : 400);
    this.detail = detail;
  }
}

export function notFound(resource: string, id: unknown): BusinessError {
  const err = new BusinessError(ERROR_CODES.RESOURCE_NOT_FOUND, { resource, id }, 404);
  err.message = `${resource}#${id} 不存在`;
  return err;
}
