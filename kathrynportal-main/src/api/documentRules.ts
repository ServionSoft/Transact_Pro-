/**
 * Document rules (Settings) — `/api/document-rules` when `VITE_API_URL` is set.
 */

import type {
  ConditionalFormattingRule,
  DocumentRule,
  RuleDocumentAction,
  RuleTrigger,
} from "@/data/mockData";
import type { ProjectType } from "@/data/mockData";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { ApiRequestError } from "@/api/storedFiles";
import { authFetch } from "@/lib/authFetch";

type ApiRulePayload = {
  id: string;
  name: string;
  kind: "standard" | "conditional";
  triggers: RuleTrigger[];
  documents: DocumentRule[];
  actions: RuleDocumentAction[];
  isActive: boolean;
  createdAt: string;
  transactionType?: string;
  propertyType?: string;
};

export type DocumentRuleUpsertBody = {
  name: string;
  kind: "standard" | "conditional";
  triggers: RuleTrigger[];
  documents: DocumentRule[];
  actions: RuleDocumentAction[];
  isActive: boolean;
};

function requireBase(): string {
  const b = getApiBaseUrl();
  if (!b) throw new Error("VITE_API_URL is not set");
  return b;
}

/** Shown when fetch fails before an HTTP response (browser "Failed to fetch"). */
export function documentRulesNetworkHint(apiBase: string): string {
  return [
    `No response from ${apiBase}. Typical fixes:`,
    "1) In a terminal: cd backend && npm run dev (API default port 4000).",
    "2) kathrynportal-main/.env → VITE_API_URL must match that URL (e.g. http://localhost:4000). Restart Vite after edits.",
    "3) backend/.env → CORS_ORIGINS must include this page’s origin (e.g. http://localhost:8080). Restart the API after edits.",
    "4) backend/.env → DATABASE_URL set; then: cd backend && npm run db:migrate && npm run db:seed:document-rules",
  ].join(" ");
}

async function documentRulesFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await authFetch(url, { ...init });
  } catch (e) {
    const base = getApiBaseUrl() ?? "(unknown)";
    const isNetwork =
      e instanceof TypeError ||
      (e instanceof Error && /failed to fetch|networkerror|load failed/i.test(e.message));
    if (isNetwork) {
      throw new ApiRequestError(documentRulesNetworkHint(base), 0, e instanceof Error ? e.message : String(e));
    }
    throw e;
  }
}

function unwrapRules(json: unknown): ApiRulePayload[] {
  if (!json || typeof json !== "object") return [];
  const data = (json as { data?: unknown }).data;
  if (!data || typeof data !== "object") return [];
  const rules = (data as { rules?: unknown }).rules;
  return Array.isArray(rules) ? (rules as ApiRulePayload[]) : [];
}

function unwrapRule(json: unknown): ApiRulePayload | null {
  if (!json || typeof json !== "object") return null;
  const data = (json as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const rule = (data as { rule?: unknown }).rule;
  return rule && typeof rule === "object" ? (rule as ApiRulePayload) : null;
}

function mapToConditional(r: ApiRulePayload): ConditionalFormattingRule {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    triggers: r.triggers ?? [],
    documents: r.documents ?? [],
    actions: r.actions ?? [],
    isActive: r.isActive,
    createdAt: r.createdAt,
    ...(r.transactionType ? { transactionType: r.transactionType as ProjectType } : {}),
    ...(r.propertyType ? { propertyType: r.propertyType } : {}),
  };
}

async function readError(res: Response, json: unknown): Promise<string> {
  if (json && typeof json === "object" && "error" in json) {
    const e = (json as { error?: { message?: string } }).error;
    if (e?.message) return e.message;
  }
  return `Request failed (${res.status})`;
}

/**
 * Loads hydrated document rules for the Settings tab (standard + conditional).
 */
export async function listDocumentRulesFromApi(): Promise<ConditionalFormattingRule[]> {
  const base = requireBase();
  const res = await documentRulesFetch(`${base.replace(/\/+$/, "")}/api/document-rules`);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const body = typeof json === "object" ? JSON.stringify(json) : String(json);
    throw new ApiRequestError(await readError(res, json), res.status, body);
  }
  const raw = unwrapRules(json);
  return raw.map((r) => mapToConditional(r));
}

export async function createDocumentRuleApi(body: DocumentRuleUpsertBody): Promise<ConditionalFormattingRule> {
  const base = requireBase();
  const res = await documentRulesFetch(`${base.replace(/\/+$/, "")}/api/document-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const bodyStr = typeof json === "object" ? JSON.stringify(json) : String(json);
    throw new ApiRequestError(await readError(res, json), res.status, bodyStr);
  }
  const rule = unwrapRule(json);
  if (!rule) throw new ApiRequestError("Invalid create response", res.status, "");
  return mapToConditional(rule);
}

export async function updateDocumentRuleApi(
  id: string,
  body: DocumentRuleUpsertBody,
): Promise<ConditionalFormattingRule> {
  const base = requireBase();
  const res = await documentRulesFetch(`${base.replace(/\/+$/, "")}/api/document-rules/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const bodyStr = typeof json === "object" ? JSON.stringify(json) : String(json);
    throw new ApiRequestError(await readError(res, json), res.status, bodyStr);
  }
  const rule = unwrapRule(json);
  if (!rule) throw new ApiRequestError("Invalid update response", res.status, "");
  return mapToConditional(rule);
}

export async function patchDocumentRuleIsActiveApi(id: string, isActive: boolean): Promise<ConditionalFormattingRule> {
  const base = requireBase();
  const res = await documentRulesFetch(`${base.replace(/\/+$/, "")}/api/document-rules/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const bodyStr = typeof json === "object" ? JSON.stringify(json) : String(json);
    throw new ApiRequestError(await readError(res, json), res.status, bodyStr);
  }
  const rule = unwrapRule(json);
  if (!rule) throw new ApiRequestError("Invalid patch response", res.status, "");
  return mapToConditional(rule);
}

export async function deleteDocumentRuleApi(id: string): Promise<void> {
  const base = requireBase();
  const res = await documentRulesFetch(`${base.replace(/\/+$/, "")}/api/document-rules/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const bodyStr = typeof json === "object" ? JSON.stringify(json) : String(json);
    throw new ApiRequestError(await readError(res, json), res.status, bodyStr);
  }
}
