import jwt from "jsonwebtoken";
import { pool } from "../config/database";
import { queryOne } from "../repositories/db";
import { config } from "../config/env";
import { BusinessError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";
import { LOG_TEMPLATES, renderLogTemplate } from "../constants/logTemplates";
import { writeAudit } from "./AuditService";
import type { SysUser } from "../models/SysUser";

export interface AuthJwtPayload {
  sub: number;
  username: string;
  role: string;
  displayName: string;
}

export const authService = {
  async login(username: string) {
    if (!username) throw new BusinessError(ERROR_CODES.VALIDATION_FAILED, { field: "username" });
    const user = await queryOne<SysUser>(pool, "SELECT * FROM sys_user WHERE username = ?", [username]);
    if (!user) {
      throw new BusinessError(ERROR_CODES.AUTH_INVALID, { username }, 401);
    }
    const payload: AuthJwtPayload = { sub: user.id, username: user.username, role: user.role, displayName: user.display_name };
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
    const { message } = renderLogTemplate(LOG_TEMPLATES.Auth.login, { username: user.username, role: user.role });
    await writeAudit({ actor: { id: user.id, username: user.username, displayName: user.display_name, role: user.role }, action: LOG_TEMPLATES.Auth.login.action, targetType: "SysUser", targetId: user.id, detail: message });
    return {
      token,
      user: { id: user.id, username: user.username, displayName: user.display_name, role: user.role, phone: user.phone },
    };
  },

  verify(token: string): AuthJwtPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as unknown as AuthJwtPayload;
    } catch {
      throw new BusinessError(ERROR_CODES.AUTH_INVALID, undefined, 401);
    }
  },
};
