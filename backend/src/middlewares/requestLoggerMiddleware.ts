import type { RequestHandler } from "express";

/** 轻量访问日志：方法、路径、耗时、请求 id。 */
export const requestLoggerMiddleware: RequestHandler = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const cost = Date.now() - start;
    console.info(
      `[${req.requestId ?? "-"}] ${req.method} ${req.originalUrl} ${res.statusCode} ${cost}ms user=${req.user?.id ?? "-"} role=${req.user?.role ?? "-"}`,
    );
  });
  next();
};
