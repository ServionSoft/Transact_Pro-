import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import type { AppRole } from "../services/permissionsService.js";
import { getEffectivePermissionKeys } from "../services/permissionsService.js";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  designation?: string | null;
  role: AppRole;
  status: "active" | "invited" | "inactive";
  roleProfileId?: string | null;
  roleProfileName?: string | null;
  /** Effective permission keys for this user (for UI + fine checks). */
  permissions: string[];
};

type JwtPayload = {
  sub: string;
  email: string;
  role: AppRole;
  tokenType: "access" | "refresh";
};

type RequestWithAuth = Request & { user?: AuthUser };

function sendAuthError(
  res: Response,
  status: number,
  code: string,
  message: string
): void {
  res.status(status).json({
    success: false,
    error: { code, message },
  });
}

function readBearer(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return m?.[1] ?? null;
}

export function requireAuth(config: AppConfig, pool: Pool | null) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!pool) {
      sendAuthError(res, 503, "DATABASE_UNAVAILABLE", "Set DATABASE_URL in backend/.env and restart the API.");
      return;
    }
    if (!config.jwtAccessSecret) {
      sendAuthError(res, 503, "AUTH_NOT_CONFIGURED", "Set JWT_ACCESS_SECRET in backend/.env and restart the API.");
      return;
    }
    const token = readBearer(req);
    if (!token) {
      sendAuthError(res, 401, "AUTH_TOKEN_MISSING", "Missing Bearer token.");
      return;
    }
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwtAccessSecret) as JwtPayload;
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "TokenExpiredError") {
        sendAuthError(res, 401, "AUTH_TOKEN_EXPIRED", "Session expired. Please sign in again.");
      } else {
        sendAuthError(res, 401, "AUTH_TOKEN_INVALID", "Invalid access token.");
      }
      return;
    }
    if (decoded.tokenType !== "access") {
      sendAuthError(res, 401, "AUTH_TOKEN_INVALID", "Invalid access token type.");
      return;
    }
    const { rows } = await pool.query<{
      id: string;
      email: string;
      name: string;
      designation: string | null;
      role: string;
      status: "active" | "invited" | "inactive";
      role_profile_id: string | null;
      role_profile_name: string | null;
    }>(
      `SELECT u.id::text, u.email, u.name, u.designation, u.role::text AS role, u.status::text AS status,
              u.role_profile_id::text AS role_profile_id,
              rp.name AS role_profile_name
       FROM public.users u
       LEFT JOIN public.role_profiles rp ON rp.id = u.role_profile_id AND rp.deleted_at IS NULL
       WHERE u.id = $1::bigint
         AND u.deleted_at IS NULL`,
      [decoded.sub]
    );
    const row = rows[0];
    if (!row) {
      sendAuthError(res, 401, "AUTH_USER_NOT_FOUND", "User does not exist.");
      return;
    }
    if (row.status !== "active") {
      sendAuthError(res, 403, "AUTH_USER_INACTIVE", "User is not active.");
      return;
    }
    const role = row.role as AppRole;
    const permSet = await getEffectivePermissionKeys(pool, row.id, role);
    const permissions = [...permSet];
    (req as RequestWithAuth).user = {
      id: row.id,
      email: row.email,
      name: row.name,
      designation: row.designation,
      role,
      status: row.status,
      roleProfileId: row.role_profile_id,
      roleProfileName: row.role_profile_name,
      permissions,
    };
    next();
  };
}

export function requireRole(...roles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as RequestWithAuth).user;
    if (!user) {
      sendAuthError(res, 401, "AUTH_TOKEN_MISSING", "Missing auth context.");
      return;
    }
    if (!roles.includes(user.role)) {
      sendAuthError(res, 403, "AUTH_FORBIDDEN", "You do not have permission to perform this action.");
      return;
    }
    next();
  };
}

/**
 * Requires an effective permission granted at login (`requireAuth` loads `user.permissions`).
 * `pool` is unused but kept so route registration stays consistent with other middleware.
 */
export function requirePermission(_pool: Pool | null, permissionKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as RequestWithAuth).user;
    if (!user) {
      sendAuthError(res, 401, "AUTH_TOKEN_MISSING", "Missing auth context.");
      return;
    }
    if (!user.permissions.includes(permissionKey)) {
      sendAuthError(res, 403, "AUTH_FORBIDDEN", "You do not have permission to perform this action.");
      return;
    }
    next();
  };
}

export function requireAnyPermission(_pool: Pool | null, keys: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as RequestWithAuth).user;
    if (!user) {
      sendAuthError(res, 401, "AUTH_TOKEN_MISSING", "Missing auth context.");
      return;
    }
    if (!keys.some((k) => user.permissions.includes(k))) {
      sendAuthError(res, 403, "AUTH_FORBIDDEN", "You do not have permission to perform this action.");
      return;
    }
    next();
  };
}

export function requireProjectAccess(pool: Pool | null) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as RequestWithAuth).user;
    const projectId = String(res.locals.numericProjectId ?? "");
    if (!user) {
      sendAuthError(res, 401, "AUTH_TOKEN_MISSING", "Missing auth context.");
      return;
    }
    if (!pool) {
      sendAuthError(res, 503, "DATABASE_UNAVAILABLE", "Set DATABASE_URL in backend/.env and restart the API.");
      return;
    }
    if (!/^\d+$/.test(projectId)) {
      sendAuthError(res, 404, "NOT_FOUND", "Unknown project id.");
      return;
    }
    if (
      user.role === "super_admin" ||
      user.permissions.includes("project_access.global") ||
      user.permissions.includes("projects.view_all")
    ) {
      next();
      return;
    }
    const { rows } = await pool.query<{ ok: string }>(
      `SELECT 1::text AS ok
       FROM public.project_assignments pa
       WHERE pa.project_id = $1::bigint
         AND pa.user_id = $2::bigint
       LIMIT 1`,
      [projectId, user.id]
    );
    if (rows.length === 0) {
      sendAuthError(res, 403, "PROJECT_ACCESS_DENIED", "You are not assigned to this transaction.");
      return;
    }
    next();
  };
}

export function currentUser(req: Request): AuthUser | null {
  return (req as RequestWithAuth).user ?? null;
}
