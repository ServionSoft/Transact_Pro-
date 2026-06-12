import type { Client, ClientStatus } from "@/data/mockData";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { ApiRequestError } from "@/api/storedFiles";
import { authFetch } from "@/lib/authFetch";

type ClientApiPayload = {
  id: string;
  name: string;
  preferredName?: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  status: "Active" | "Inactive" | "Prospect";
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  assistantContactId?: string;
  createdAt: string;
  projectCount: number;
};

export type ClientUpsertBody = {
  name: string;
  preferredName?: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  status: ClientStatus;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  assistantContactId?: string;
};

function requireBase(): string {
  const base = getApiBaseUrl();
  if (!base) throw new Error("VITE_API_URL is not set");
  return base;
}

function mapClient(p: ClientApiPayload): Client {
  return {
    id: p.id,
    name: p.name,
    preferredName: p.preferredName ?? "",
    email: p.email,
    phone: p.phone,
    company: p.company,
    role: p.role,
    status: p.status,
    propertyAddress: p.propertyAddress,
    city: p.city,
    state: p.state,
    zip: p.zip,
    notes: p.notes,
    assistantContactId: p.assistantContactId ?? "",
    createdAt: p.createdAt,
    projectCount: p.projectCount,
  };
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

async function apiCall(url: string, init?: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await authFetch(url, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ApiRequestError(
      `No response from ${getApiBaseUrl() ?? "API"}. Start backend with: cd backend && npm run dev.`,
      0,
      msg
    );
  }
  const json = await parseJson(res);
  if (!res.ok) {
    const message = readErrorMessage(json, `Clients request failed (${res.status})`);
    throw new ApiRequestError(message, res.status, typeof json === "object" ? JSON.stringify(json) : String(json));
  }
  return json;
}

export async function listClientsFromApi(options?: { archived?: boolean }): Promise<Client[]> {
  const base = requireBase();
  const qs = options?.archived ? "?archived=true" : "";
  const json = await apiCall(`${base.replace(/\/+$/, "")}/api/clients${qs}`);
  const clients = (json as { data?: { clients?: unknown } }).data?.clients;
  if (!Array.isArray(clients)) return [];
  return clients.map((c) => mapClient(c as ClientApiPayload));
}

export async function getClientFromApi(id: string): Promise<Client> {
  const base = requireBase();
  const json = await apiCall(`${base.replace(/\/+$/, "")}/api/clients/${encodeURIComponent(id)}`);
  const client = (json as { data?: { client?: unknown } }).data?.client;
  if (!client || typeof client !== "object") {
    throw new ApiRequestError("Invalid client response", 500, "");
  }
  return mapClient(client as ClientApiPayload);
}

export async function createClientApi(body: ClientUpsertBody): Promise<Client> {
  const base = requireBase();
  const json = await apiCall(`${base.replace(/\/+$/, "")}/api/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const client = (json as { data?: { client?: unknown } }).data?.client;
  if (!client || typeof client !== "object") {
    throw new ApiRequestError("Invalid create response", 500, "");
  }
  return mapClient(client as ClientApiPayload);
}

export async function updateClientApi(id: string, body: ClientUpsertBody): Promise<Client> {
  const base = requireBase();
  const json = await apiCall(`${base.replace(/\/+$/, "")}/api/clients/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const client = (json as { data?: { client?: unknown } }).data?.client;
  if (!client || typeof client !== "object") {
    throw new ApiRequestError("Invalid update response", 500, "");
  }
  return mapClient(client as ClientApiPayload);
}

export async function archiveClientApi(id: string): Promise<void> {
  const base = requireBase();
  await apiCall(`${base.replace(/\/+$/, "")}/api/clients/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
  });
}

export async function unarchiveClientApi(id: string): Promise<void> {
  const base = requireBase();
  await apiCall(`${base.replace(/\/+$/, "")}/api/clients/${encodeURIComponent(id)}/unarchive`, {
    method: "PATCH",
  });
}

export async function permanentlyDeleteClientApi(id: string): Promise<void> {
  const base = requireBase();
  await apiCall(`${base.replace(/\/+$/, "")}/api/clients/${encodeURIComponent(id)}/permanent`, {
    method: "DELETE",
  });
}
