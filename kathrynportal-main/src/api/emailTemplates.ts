import type { EmailTemplate } from "@/data/mockData";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { ApiRequestError } from "@/api/storedFiles";
import { authFetch } from "@/lib/authFetch";

type EmailTemplateApiPayload = {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type EmailTemplateUpsertBody = {
  name: string;
  category: string;
  subject: string;
  body: string;
  isActive?: boolean;
};

function requireBase(): string {
  const base = getApiBaseUrl();
  if (!base) throw new Error("VITE_API_URL is not set");
  return base.replace(/\/+$/, "");
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

function readErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object" && "error" in json) {
    const err = (json as { error?: { message?: string } }).error;
    if (typeof err?.message === "string" && err.message.trim()) return err.message;
  }
  return fallback;
}

async function apiCall(path: string, init?: RequestInit): Promise<unknown> {
  const url = `${requireBase()}${path}`;
  let res: Response;
  try {
    res = await authFetch(url, init);
  } catch (e) {
    throw new ApiRequestError(`No response from ${getApiBaseUrl() ?? "API"}.`, 0, e instanceof Error ? e.message : String(e));
  }
  const json = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiRequestError(readErrorMessage(json, `Email templates request failed (${res.status})`), res.status, typeof json === "object" ? JSON.stringify(json) : String(json));
  }
  return json;
}

function mapTemplate(p: EmailTemplateApiPayload): EmailTemplate {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    subject: p.subject,
    body: p.body,
  };
}

export async function listEmailTemplatesFromApi(): Promise<EmailTemplate[]> {
  const json = await apiCall("/api/email-templates");
  const rows = (json as { data?: { templates?: unknown } }).data?.templates;
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => mapTemplate(r as EmailTemplateApiPayload));
}

export async function createEmailTemplateApi(body: EmailTemplateUpsertBody): Promise<EmailTemplate> {
  const json = await apiCall("/api/email-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const row = (json as { data?: { template?: unknown } }).data?.template;
  if (!row || typeof row !== "object") throw new ApiRequestError("Invalid create template response", 500, "");
  return mapTemplate(row as EmailTemplateApiPayload);
}

export async function updateEmailTemplateApi(id: string, body: EmailTemplateUpsertBody): Promise<EmailTemplate> {
  const json = await apiCall(`/api/email-templates/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const row = (json as { data?: { template?: unknown } }).data?.template;
  if (!row || typeof row !== "object") throw new ApiRequestError("Invalid update template response", 500, "");
  return mapTemplate(row as EmailTemplateApiPayload);
}

export async function deleteEmailTemplateApi(id: string): Promise<void> {
  await apiCall(`/api/email-templates/${encodeURIComponent(id)}`, { method: "DELETE" });
}

