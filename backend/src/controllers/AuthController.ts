import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { config } from "../config/env";
import { Role, type Role as RoleType } from "../constants/Role";
import { AppError } from "../utils/AppError";
import { ERROR_CODES } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * 本地演示账号（无第三方服务）：
 * 用户名即角色小写，如 dispatcher / crew_leader / warehouse / auditor / admin
 */
const DEMO_USERS: Record<string, { id: number; name: string; role: RoleType }> = {
  dispatcher: { id: 1, name: "调度员-林敏", role: "DISPATCHER" },
  crew_leader: { id: 101, name: "班组长-周强", role: "CREW_LEADER" },
  warehouse: { id: 201, name: "仓管-陈仓", role: "WAREHOUSE" },
  auditor: { id: 301, name: "审计员-苏审", role: "AUDITOR" },
  admin: { id: 999, name: "管理员", role: "ADMIN" }
};

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const username = String(req.body?.username ?? "").trim().toLowerCase();
    const user = DEMO_USERS[username];
    if (!user) {
      throw new AppError(
        ERROR_CODES.AUTH_INVALID,
        `用户不存在，可选：${Object.keys(DEMO_USERS).join(" / ")}`,
        401
      );
    }
    if (!req.body?.password || req.body.password !== "grid-repair") {
      throw new AppError(ERROR_CODES.AUTH_INVALID, ERROR_MESSAGES.AUTH_INVALID, 401);
    }
    const token = jwt.sign(user, config.jwtSecret, { expiresIn: "12h" });
    res.json({ token, user, roles: Role });
  })
};
