import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * 控制器包装：async 路由必须经此把 rejected promise 转交给 next(err)，
 * service 抛业务异常、controller 做参数包装，最终由 errorHandler 统一格式化。
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
