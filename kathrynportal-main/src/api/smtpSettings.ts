import { getApiBaseUrl } from "@/lib/apiConfig";
import { authFetch } from "@/lib/authFetch";
import { ApiRequestError } from "@/api/storedFiles";

export type SmtpSettingsDto = {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  authUser: string;
  hasPassword: boolean;
  fromEmail: string;
  fromName: string;
  vendorSignatureFileId?: string | null;
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

export async function getSmtpSettingsFromApi(): Promise<SmtpSettingsDto> {
  const json = (await apiJson("/api/smtp-settings")) as { data?: { settings?: SmtpSettingsDto } };
  const s = json.data?.settings;
  if (!s) throw new ApiRequestError("Invalid SMTP settings response.", 500);
  return s;
}

export type SmtpSettingsSavePayload = {
  host: string;
  port: number;
  secure: boolean;
  authUser: string;
  password?: string;
  fromEmail: string;
  fromName: string;
};

export async function saveSmtpSettingsToApi(payload: SmtpSettingsSavePayload): Promise<SmtpSettingsDto> {
  const json = (await apiJson("/api/smtp-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  })) as { data?: { settings?: SmtpSettingsDto } };
  const s = json.data?.settings;
  if (!s) throw new ApiRequestError("Invalid SMTP settings response.", 500);
  return s;
}

export type SmtpTestPayload =
  | { testSaved: true; sendTestEmailTo?: string }
  | {
      host: string;
      port: number;
      secure: boolean;
      authUser: string;
      password?: string;
      useStoredPassword?: boolean;
      fromEmail?: string;
      fromName?: string;
      /** Defaults to signed-in user email if omitted */
      sendTestEmailTo?: string;
    };

export async function testSmtpConnectionFromApi(payload: SmtpTestPayload): Promise<string> {
  const json = (await apiJson("/api/smtp-settings/test", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as { data?: { message?: string }; message?: string };
  return json.data?.message ?? json.message ?? "SMTP connection verified.";
}
