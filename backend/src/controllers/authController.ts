import type { Request, Response } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { currentUser } from "../middleware/auth.js";
import { login, me, refresh, changePassword } from "../services/authService.js";

function parseLoginBody(body: unknown): { email: string; password: string } | null {
  if (body == null || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.email !== "string" || typeof b.password !== "string") return null;
  return { email: b.email, password: b.password };
}

function parseRefreshBody(body: unknown): { refreshToken: string } | null {
  if (body == null || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.refreshToken !== "string") return null;
  return { refreshToken: b.refreshToken };
}

function parseChangePasswordBody(body: unknown): { currentPassword: string; newPassword: string } | null {
  if (body == null || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.currentPassword !== "string" || typeof b.newPassword !== "string") return null;
  return { currentPassword: b.currentPassword, newPassword: b.newPassword };
}

export function createAuthController(pool: Pool, config: AppConfig) {
  return {
    async login(req: Request, res: Response): Promise<void> {
      const body = parseLoginBody(req.body);
      if (!body) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Body must include email and password." },
        });
        return;
      }
      try {
        const result = await login(pool, config, body);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: result.session, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "AUTH_LOGIN_FAILED", message: "Could not complete login." },
        });
      }
    },

    async me(req: Request, res: Response): Promise<void> {
      const auth = currentUser(req);
      if (!auth) {
        res.status(401).json({
          success: false,
          error: { code: "AUTH_TOKEN_MISSING", message: "Missing auth context." },
        });
        return;
      }
      try {
        const user = await me(pool, auth.id);
        if (!user) {
          res.status(404).json({
            success: false,
            error: { code: "AUTH_USER_NOT_FOUND", message: "User not found." },
          });
          return;
        }
        res.json({ success: true, data: { user }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "AUTH_ME_FAILED", message: "Could not load user profile." },
        });
      }
    },

    async refresh(req: Request, res: Response): Promise<void> {
      const body = parseRefreshBody(req.body);
      if (!body) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Body must include refreshToken." },
        });
        return;
      }
      try {
        const result = await refresh(pool, config, body.refreshToken);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: result, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "AUTH_REFRESH_FAILED", message: "Could not refresh session." },
        });
      }
    },

    async logout(req: Request, res: Response): Promise<void> {
      const body = parseRefreshBody(req.body);
      if (!body) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Body must include refreshToken." },
        });
        return;
      }
      // Stateless JWT: logout handled client-side by discarding tokens.
      res.json({ success: true, data: {}, message: "Logged out." });
    },

    async changePassword(req: Request, res: Response): Promise<void> {
      const auth = currentUser(req);
      if (!auth) {
        res.status(401).json({
          success: false,
          error: { code: "AUTH_TOKEN_MISSING", message: "Missing auth context." },
        });
        return;
      }
      const body = parseChangePasswordBody(req.body);
      if (!body) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Body must include currentPassword and newPassword." },
        });
        return;
      }
      try {
        const result = await changePassword(pool, auth.id, body);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: {}, message: "Password updated." });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "AUTH_PASSWORD_CHANGE_FAILED", message: "Could not change password." },
        });
      }
    },
  };
}
