import { getApiBaseUrl } from "@/lib/apiConfig";
export class AuthApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public bodyText?: string,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}


export type AuthRole = "super_admin" | "admin" | "coordinator";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  designation?: string | null;
  role: AuthRole;
  roleProfileId?: string | null;
  roleProfileName?: string | null;
  /** Effective permission keys (when API returns them). */
  permissions?: string[];
};

type LoginResponse = {
  data?: {
    user?: AuthUser;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  };
};

type RefreshResponse = {
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

function requireBase(): string {
  const base = getApiBaseUrl();
  if (!base) throw new Error("VITE_API_URL is not set");
  return base.replace(/\/+$/, "");
}

async function parseJson(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

function readErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object" && "error" in json) {
    const err = (json as { error?: { message?: string } }).error;
    if (typeof err?.message === "string" && err.message.trim()) return err.message;
  }
  return fallback;
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  const url = `${requireBase()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new AuthApiError(`No response from ${getApiBaseUrl() ?? "API"}.`, 0, msg);
  }
  const json = await parseJson(res);
  if (!res.ok) {
    throw new AuthApiError(readErrorMessage(json, `Auth request failed (${res.status})`), res.status);
  }
  return json;
}

export async function loginApi(email: string, password: string): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> {
  const json = (await postJson("/api/auth/login", { email, password })) as LoginResponse;
  const user = json.data?.user;
  const accessToken = json.data?.accessToken;
  const refreshToken = json.data?.refreshToken;
  if (!user || !accessToken || !refreshToken) {
    throw new AuthApiError("Invalid login response", 500);
  }
  return { user, accessToken, refreshToken };
}

export async function meApi(accessToken: string): Promise<AuthUser> {
  const url = `${requireBase()}/api/auth/me`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const json = await parseJson(res);
  if (!res.ok) {
    throw new AuthApiError(readErrorMessage(json, `Session check failed (${res.status})`), res.status);
  }
  const user = (json as { data?: { user?: AuthUser } }).data?.user;
  if (!user) throw new AuthApiError("Invalid session response", 500);
  return user;
}

export async function acceptInviteApi(token: string, password: string): Promise<void> {
  await postJson("/api/auth/accept-invite", { token, password });
}

export async function refreshApi(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const json = (await postJson("/api/auth/refresh", { refreshToken })) as RefreshResponse;
  const accessToken = json.data?.accessToken;
  const nextRefresh = json.data?.refreshToken;
  if (!accessToken || !nextRefresh) {
    throw new AuthApiError("Invalid refresh response", 500);
  }
  return { accessToken, refreshToken: nextRefresh };
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await postJson("/api/auth/logout", { refreshToken });
}
