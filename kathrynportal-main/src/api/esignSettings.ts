import { getApiBaseUrl } from "@/lib/apiConfig";
import { authFetch } from "@/lib/authFetch";

export type EsignSettingsDto = {
  vendorName: string;
  vendorEmail: string;
  vendorSignatureFileId: string | null;
  updatedAt: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
};

function requireBaseUrl(): string {
  const base = getApiBaseUrl();
  if (!base) throw new Error("VITE_API_URL is not set.");
  return base;
}

async function parseJson<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text) as ApiEnvelope<T>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = requireBaseUrl();
  const response = await authFetch(`${base}${path}`, init);
  const payload = await parseJson<T>(response);
  if (!response.ok) {
    const message = payload?.error?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (!payload?.data) throw new Error("Invalid API response.");
  return payload.data;
}

export async function getEsignSettingsFromApi(): Promise<EsignSettingsDto> {
  const data = await request<{ settings: EsignSettingsDto }>("/api/esign-settings");
  return data.settings;
}

export async function saveEsignSettingsToApi(payload: {
  vendorName: string;
  vendorEmail: string;
  vendorSignatureFileId: string | null;
}): Promise<EsignSettingsDto> {
  const data = await request<{ settings: EsignSettingsDto }>("/api/esign-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.settings;
}

