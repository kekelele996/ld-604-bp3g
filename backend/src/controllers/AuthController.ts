import type { Request, Response } from "express";
import { authService } from "../services/AuthService";

export const authController = {
  async login(req: Request, res: Response) {
    const { username } = req.body ?? {};
    const result = await authService.login(String(username ?? "").trim());
    res.json(result);
  },

  async me(req: Request, res: Response) {
    res.json({ user: req.user ?? null });
  },
};
