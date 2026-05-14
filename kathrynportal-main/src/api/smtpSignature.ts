import { getApiBaseUrl } from "@/lib/apiConfig";
import { authFetch } from "@/lib/authFetch";
import type { FileAttachment } from "@/data/mockData";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
};

async function parseJson<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text) as ApiEnvelope<T>;
}

function requireBaseUrl(): string {
  const base = getApiBaseUrl();
  if (!base) throw new Error("VITE_API_URL is not set.");
  return base;
}

function mapFileDto(raw: any): FileAttachment | null {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id != null ? String(raw.id) : null;
  if (!id) return null;
  return {
    id,
    name: String(raw.name ?? "signature.png"),
    size: String(raw.size ?? raw.size_display ?? "—"),
    uploadedBy: String(raw.uploaded_by_name ?? raw.uploadedBy ?? "—"),
    uploadedAt: String(raw.created_at ?? raw.uploadedAt ?? new Date().toISOString().split("T")[0]),
    type: String(raw.mime_type ?? raw.type ?? "image/png"),
    folderId: raw.folder_id == null ? null : String(raw.folder_id),
    serverBacked: true,
    downloadUrl: typeof raw.download_url === "string" ? raw.download_url : undefined,
  };
}

export async function uploadVendorSignaturePng(file: File): Promise<{ file: FileAttachment }> {
  const base = requireBaseUrl();
  const fd = new FormData();
  fd.append("file", file);
  const res = await authFetch(`${base}/api/smtp-settings/vendor-signature`, { method: "POST", body: fd });
  const payload = await parseJson<{ file: any }>(res);
  if (!res.ok) {
    const message = payload?.error?.message ?? `Upload failed (${res.status})`;
    throw new Error(message);
  }
  const mapped = mapFileDto(payload?.data?.file);
  if (!mapped) throw new Error("Upload succeeded but response was invalid.");
  return { file: mapped };
}

