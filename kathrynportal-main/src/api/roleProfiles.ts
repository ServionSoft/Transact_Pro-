import { getApiBaseUrl } from "@/lib/apiConfig";
import { authFetch } from "@/lib/authFetch";
import { ApiRequestError } from "@/api/storedFiles";

export type RoleProfileListItem = {
  id: string;
  name: string;
  description: string | null;
  defaultDesignation: string | null;
  isSystem: boolean;
};

export type RoleProfileDetail = RoleProfileListItem & {
  permissionKeys: string[];
};

function requireBase(): string {
  const b = getApiBaseUrl();
  if (!b) throw new Error("VITE_API_URL is not set");
  return b.replace(/\/+$/, "");
}

async function parseJson(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

async function apiJson(path: string, init?: RequestInit): Promise<unknown> {
  const url = `${requireBase()}${path.startsWith("/") ? path : `/${path}`}`;
  let res: Response;
  try {
    res = await authFetch(url, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ApiRequestError(`No response from ${getApiBaseUrl() ?? "API"}.`, 0, msg);
  }
  const json = await parseJson(res);
  if (!res.ok) {
    const err = json && typeof json === "object" && "error" in json ? (json as { error?: { message?: string } }).error?.message : "";
    throw new ApiRequestError(err || `Request failed (${res.status})`, res.status);
  }
  return json;
}

export async function listRoleProfilesFromApi(): Promise<RoleProfileListItem[]> {
  const json = (await apiJson("/api/role-profiles")) as { data?: { profiles?: RoleProfileListItem[] } };
  return json.data?.profiles ?? [];
}

export async function getRoleProfileFromApi(id: string): Promise<RoleProfileDetail> {
  const json = (await apiJson(`/api/role-profiles/${encodeURIComponent(id)}`)) as { data?: { profile?: RoleProfileDetail } };
  const p = json.data?.profile;
  if (!p) throw new ApiRequestError("Invalid response", 500);
  return p;
}

export async function createRoleProfileApi(body: {
  name: string;
  description?: string | null;
  defaultDesignation?: string | null;
  permissionKeys: string[];
}): Promise<RoleProfileDetail> {
  const json = (await apiJson("/api/role-profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })) as { data?: { profile?: RoleProfileDetail } };
  const p = json.data?.profile;
  if (!p) throw new ApiRequestError("Invalid response", 500);
  return p;
}

export async function updateRoleProfileApi(
  id: string,
  body: { name?: string; description?: string | null; defaultDesignation?: string | null; permissionKeys?: string[] }
): Promise<RoleProfileDetail> {
  const json = (await apiJson(`/api/role-profiles/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })) as { data?: { profile?: RoleProfileDetail } };
  const p = json.data?.profile;
  if (!p) throw new ApiRequestError("Invalid response", 500);
  return p;
}

export async function deleteRoleProfileApi(id: string): Promise<void> {
  await apiJson(`/api/role-profiles/${encodeURIComponent(id)}`, { method: "DELETE" });
}
