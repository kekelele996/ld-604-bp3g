import type { RequestHandler } from "express";

/** 统一把 async controller 的 reject 交给 errorHandlerMiddleware。 */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
