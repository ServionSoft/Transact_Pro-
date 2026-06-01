import { getApiBaseUrl } from "@/lib/apiConfig";
import { authFetch } from "@/lib/authFetch";
import { ApiRequestError } from "@/api/storedFiles";

export type DocusignSettingsDto = {
  id: string;
  environment: "demo" | "production";
  integrationKey: string;
  userId: string;
  accountId: string;
  basePath: string;
  oauthHost: string;
  consentRedirectUri: string;
  hasPrivateKey: boolean;
  hasConnectHmacKey: boolean;
  configured: boolean;
  source: "database" | "environment" | "none";
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
    res = await authFetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string>) },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ApiRequestError(`No response from ${getApiBaseUrl() ?? "API"}.`, 0, msg);
  }
  const json = await parseJson(res);
  if (!res.ok) {
    const err =
      json && typeof json === "object" && "error" in json
        ? (json as { error?: { message?: string } }).error?.message
        : "";
    throw new ApiRequestError(err || `Request failed (${res.status})`, res.status);
  }
  return json;
}

export async function getDocusignSettingsFromApi(): Promise<DocusignSettingsDto> {
  const json = (await apiJson("/api/docusign-settings")) as { data?: { settings?: DocusignSettingsDto } };
  const s = json.data?.settings;
  if (!s) throw new ApiRequestError("Invalid DocuSign settings response.", 500);
  return s;
}

export type DocusignSettingsSavePayload = {
  environment: "demo" | "production";
  integrationKey: string;
  userId: string;
  accountId: string;
  consentRedirectUri?: string;
  privateKey?: string;
  connectHmacKey?: string;
};

export async function saveDocusignSettingsToApi(payload: DocusignSettingsSavePayload): Promise<DocusignSettingsDto> {
  const json = (await apiJson("/api/docusign-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  })) as { data?: { settings?: DocusignSettingsDto } };
  const s = json.data?.settings;
  if (!s) throw new ApiRequestError("Invalid DocuSign settings response.", 500);
  return s;
}

export type DocusignTestPayload =
  | { testSaved: true }
  | {
      environment: "demo" | "production";
      integrationKey: string;
      userId: string;
      accountId: string;
      consentRedirectUri?: string;
      privateKey?: string;
      useStoredPrivateKey?: boolean;
    };

export type DocusignTestResult = { message: string; consentUrl: string };

export async function testDocusignConnectionFromApi(payload: DocusignTestPayload): Promise<DocusignTestResult> {
  const json = (await apiJson("/api/docusign-settings/test", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as { data?: DocusignTestResult };
  const data = json.data;
  if (!data?.message) throw new ApiRequestError("Invalid DocuSign test response.", 500);
  return data;
}

export async function getDocusignConsentUrlFromApi(): Promise<string> {
  const json = (await apiJson("/api/docusign-settings/consent-url")) as { data?: { consentUrl?: string } };
  const url = json.data?.consentUrl;
  if (!url) throw new ApiRequestError("Invalid consent URL response.", 500);
  return url;
}
