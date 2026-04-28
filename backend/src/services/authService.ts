import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import type { AuthUser } from "../middleware/auth.js";
import type { AppRole } from "./permissionsService.js";
import { getEffectivePermissionKeys } from "./permissionsService.js";

type UserRow = {
  id: string;
  email: string;
  name: string;
  designation?: string | null;
  role: string;
  status: "active" | "invited" | "inactive";
  password_hash: string;
  role_profile_id?: string | null;
  role_profile_name?: string | null;
};

type TokenPayload = {
  sub: string;
  email: string;
  role: AppRole;
  tokenType: "access" | "refresh";
};

export type AuthError = {
  status: number;
  code: string;
  message: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
};

function parseDurationSeconds(raw: string): number {
  const v = raw.trim().toLowerCase();
  const m = /^(\d+)([smhd])?$/.exec(v);
  if (!m) return 900;
  const n = Number(m[1]);
  const unit = m[2] ?? "s";
  if (unit === "m") return n * 60;
  if (unit === "h") return n * 3600;
  if (unit === "d") return n * 86400;
  return n;
}

function issueToken(
  payload: TokenPayload,
  secret: string,
  ttl: string
): string {
  return jwt.sign(payload, secret, { expiresIn: ttl as jwt.SignOptions["expiresIn"] });
}

async function toAuthUser(pool: Pool, row: UserRow): Promise<AuthUser> {
  const role = row.role as AppRole;
  const permSet = await getEffectivePermissionKeys(pool, row.id, role);
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    designation: row.designation ?? null,
    role,
    status: row.status,
    roleProfileId: row.role_profile_id ?? null,
    roleProfileName: row.role_profile_name ?? null,
    permissions: [...permSet],
  };
}

async function findUserByEmail(pool: Pool, email: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT u.id::text, u.email, u.name, u.designation, u.role::text AS role, u.status::text AS status, u.password_hash,
            u.role_profile_id::text AS role_profile_id,
            rp.name AS role_profile_name
     FROM public.users u
     LEFT JOIN public.role_profiles rp ON rp.id = u.role_profile_id AND rp.deleted_at IS NULL
     WHERE LOWER(u.email) = LOWER($1)
       AND u.deleted_at IS NULL
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT 1`,
    [email.trim()]
  );
  return rows[0] ?? null;
}

async function findUserById(pool: Pool, id: string): Promise<AuthUser | null> {
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
       AND u.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row || row.status !== "active") return null;
  return toAuthUser(pool, {
    id: row.id,
    email: row.email,
    name: row.name,
      designation: row.designation,
    role: row.role,
    status: row.status,
    password_hash: "",
    role_profile_id: row.role_profile_id,
    role_profile_name: row.role_profile_name,
  });
}

function ensureAuthConfig(config: AppConfig): AuthError | null {
  if (!config.jwtAccessSecret) {
    return { status: 503, code: "AUTH_NOT_CONFIGURED", message: "Set JWT_ACCESS_SECRET in backend/.env." };
  }
  if (!config.jwtRefreshSecret) {
    return { status: 503, code: "AUTH_NOT_CONFIGURED", message: "Set JWT_REFRESH_SECRET in backend/.env." };
  }
  return null;
}

export async function login(
  pool: Pool,
  config: AppConfig,
  input: { email: string; password: string }
): Promise<{ session: AuthSession } | { error: AuthError }> {
  const cfg = ensureAuthConfig(config);
  if (cfg) return { error: cfg };

  const email = input.email.trim();
  const password = input.password;
  if (!email || !password) {
    return { error: { status: 400, code: "INVALID_BODY", message: "Email and password are required." } };
  }

  const row = await findUserByEmail(pool, email);
  if (!row) {
    return { error: { status: 401, code: "AUTH_INVALID_CREDENTIALS", message: "Invalid email or password." } };
  }
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    return { error: { status: 401, code: "AUTH_INVALID_CREDENTIALS", message: "Invalid email or password." } };
  }
  if (row.status !== "active") {
    return { error: { status: 403, code: "AUTH_USER_INACTIVE", message: "User is not active." } };
  }
  const user = await toAuthUser(pool, row);
  const accessToken = issueToken(
    { sub: user.id, email: user.email, role: user.role, tokenType: "access" },
    config.jwtAccessSecret!,
    config.accessTokenTtl
  );
  const refreshToken = issueToken(
    { sub: user.id, email: user.email, role: user.role, tokenType: "refresh" },
    config.jwtRefreshSecret!,
    config.refreshTokenTtl
  );
  const expiresIn = parseDurationSeconds(config.accessTokenTtl);
  return { session: { accessToken, refreshToken, expiresIn, user } };
}

export async function me(pool: Pool, userId: string): Promise<AuthUser | null> {
  return findUserById(pool, userId);
}

export async function refresh(
  pool: Pool,
  config: AppConfig,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | { error: AuthError }> {
  const cfg = ensureAuthConfig(config);
  if (cfg) return { error: cfg };
  if (!refreshToken.trim()) {
    return { error: { status: 400, code: "INVALID_BODY", message: "refreshToken is required." } };
  }
  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(refreshToken, config.jwtRefreshSecret!) as TokenPayload;
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "TokenExpiredError") {
      return { error: { status: 401, code: "AUTH_REFRESH_EXPIRED", message: "Refresh token expired." } };
    }
    return { error: { status: 401, code: "AUTH_REFRESH_INVALID", message: "Invalid refresh token." } };
  }
  if (decoded.tokenType !== "refresh") {
    return { error: { status: 401, code: "AUTH_REFRESH_INVALID", message: "Invalid refresh token type." } };
  }
  const user = await findUserById(pool, decoded.sub);
  if (!user) {
    return { error: { status: 401, code: "AUTH_USER_NOT_FOUND", message: "User not found." } };
  }
  const nextAccessToken = issueToken(
    { sub: user.id, email: user.email, role: user.role, tokenType: "access" },
    config.jwtAccessSecret!,
    config.accessTokenTtl
  );
  const nextRefreshToken = issueToken(
    { sub: user.id, email: user.email, role: user.role, tokenType: "refresh" },
    config.jwtRefreshSecret!,
    config.refreshTokenTtl
  );
  return {
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
    expiresIn: parseDurationSeconds(config.accessTokenTtl),
  };
}
