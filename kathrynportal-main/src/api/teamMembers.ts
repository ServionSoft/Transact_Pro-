import { getApiBaseUrl } from "@/lib/apiConfig";
import { authFetch } from "@/lib/authFetch";
import { ApiRequestError } from "@/api/storedFiles";

export type TeamMemberApiRole = "super_admin" | "admin" | "coordinator";
export type TeamMemberStatus = "active" | "invited" | "inactive";

export type TeamMemberListItem = {
  id: string;
  name: string;
  designation: string | null;
  email: string;
  role: TeamMemberApiRole;
  status: TeamMemberStatus;
  lastActiveAt: string | null;
  createdAt: string;
  roleProfileId: string | null;
  roleProfileName: string | null;
};

export type TeamMemberDetail = TeamMemberListItem & {
  permissionKeys: string[];
  permissionOverrides: { key: string; allowed: boolean }[];
  projectIds: string[];
};

export type PermissionRow = { key: string; module: string; description: string };

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

export async function getRoleDefaultPermissionKeysFromApi(role: TeamMemberApiRole): Promise<string[]> {
  const json = (await apiJson(`/api/team-members/role-defaults/${encodeURIComponent(role)}`)) as {
    data?: { permissionKeys?: string[] };
  };
  return json.data?.permissionKeys ?? [];
}

export async function listPermissionCatalogFromApi(): Promise<PermissionRow[]> {
  const json = (await apiJson("/api/team-members/permissions")) as { data?: { permissions?: PermissionRow[] } };
  return json.data?.permissions ?? [];
}

export async function listProjectsPickerFromApi(): Promise<{ id: string; name: string }[]> {
  const json = (await apiJson("/api/team-members/meta/projects")) as { data?: { projects?: { id: string; name: string }[] } };
  return json.data?.projects ?? [];
}

export async function listTeamMembersFromApi(): Promise<TeamMemberListItem[]> {
  const json = (await apiJson("/api/team-members")) as { data?: { users?: TeamMemberListItem[] } };
  return json.data?.users ?? [];
}

export async function getTeamMemberFromApi(id: string): Promise<TeamMemberDetail> {
  const json = (await apiJson(`/api/team-members/${encodeURIComponent(id)}`)) as { data?: { user?: TeamMemberDetail } };
  const u = json.data?.user;
  if (!u) throw new ApiRequestError("Invalid response", 500);
  return u;
}

export type TeamMemberUpsertBody = {
  name: string;
  designation?: string | null;
  email: string;
  password?: string;
  /** Only when creating/promoting a super administrator (super_admin actor). Otherwise omit; server sets admin/coordinator from the permission profile. */
  role?: TeamMemberApiRole;
  status?: TeamMemberStatus;
  roleProfileId?: string | null;
  permissionOverrides?: { key: string; allowed: boolean }[];
  projectIds?: string[];
  desiredPermissionKeys?: string[];
};

export async function createTeamMemberApi(body: TeamMemberUpsertBody): Promise<TeamMemberDetail> {
  const json = (await apiJson("/api/team-members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })) as { data?: { user?: TeamMemberDetail } };
  const u = json.data?.user;
  if (!u) throw new ApiRequestError("Invalid response", 500);
  return u;
}

export async function inviteTeamMemberApi(
  body: Omit<TeamMemberUpsertBody, "password" | "status"> & { desiredPermissionKeys?: string[] }
): Promise<{
  user: TeamMemberDetail;
  inviteUrl?: string;
  devToken?: string;
}> {
  const json = (await apiJson("/api/team-members/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })) as { data?: { user?: TeamMemberDetail; inviteUrl?: string; devToken?: string } };
  const u = json.data?.user;
  if (!u) throw new ApiRequestError("Invalid response", 500);
  return { user: u, inviteUrl: json.data?.inviteUrl, devToken: json.data?.devToken };
}

export async function updateTeamMemberApi(id: string, body: Partial<TeamMemberUpsertBody>): Promise<TeamMemberDetail> {
  const json = (await apiJson(`/api/team-members/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })) as { data?: { user?: TeamMemberDetail } };
  const u = json.data?.user;
  if (!u) throw new ApiRequestError("Invalid response", 500);
  return u;
}

export async function deactivateTeamMemberApi(id: string): Promise<void> {
  await apiJson(`/api/team-members/${encodeURIComponent(id)}/deactivate`, { method: "PATCH" });
}
