import { getApiBaseUrl } from "@/lib/apiConfig";
import { authFetch } from "@/lib/authFetch";

export type EsignDocumentStatus =
  | "draft_uploaded"
  | "editing"
  | "ready_for_send"
  | "conversion_failed"
  | "sent"
  | "completed"
  | "declined"
  | "voided";

export type EsignFieldDto = {
  id?: string;
  fieldType: "signature" | "initials" | "text" | "date" | "checkbox";
  role: "vendor" | "client";
  required: boolean;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  prefilledText?: string;
  sortOrder: number;
};

export type EsignRecipientDto = {
  id?: string;
  name?: string;
  email: string;
  role: "vendor" | "client";
  routingOrder: number;
};

export type EsignDocumentDto = {
  id: string;
  projectId: string;
  projectDocumentId: string | null;
  originalFileId: string;
  renderFileId: string | null;
  provider: string | null;
  providerDocumentId: string | null;
  title: string;
  status: EsignDocumentStatus;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Set after DocuSign Connect imports the combined signed PDF. */
  signedStoredFileId?: string | null;
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

export async function listEsignDocumentsApi(projectId: string): Promise<EsignDocumentDto[]> {
  const data = await request<{ documents: EsignDocumentDto[] }>(`/api/projects/${encodeURIComponent(projectId)}/esign-documents`);
  return data.documents ?? [];
}

export async function createEsignDocumentApi(
  projectId: string,
  body: { title: string; storedFileId: string; projectDocumentId?: string | null }
): Promise<EsignDocumentDto> {
  const data = await request<{ document: EsignDocumentDto }>(`/api/projects/${encodeURIComponent(projectId)}/esign-documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return data.document;
}

export async function getEsignDocumentApi(
  projectId: string,
  documentId: string
): Promise<{ document: EsignDocumentDto; fields: EsignFieldDto[]; recipients: EsignRecipientDto[] }> {
  return request<{ document: EsignDocumentDto; fields: EsignFieldDto[]; recipients: EsignRecipientDto[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/esign-documents/${encodeURIComponent(documentId)}`
  );
}

export async function saveEsignDocumentApi(
  projectId: string,
  documentId: string,
  body: { fields: EsignFieldDto[]; recipients?: EsignRecipientDto[]; autosave: boolean }
): Promise<void> {
  await request<{ saved: boolean }>(`/api/projects/${encodeURIComponent(projectId)}/esign-documents/${encodeURIComponent(documentId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function markEsignDocumentReadyApi(projectId: string, documentId: string): Promise<void> {
  await request<{ ready: boolean }>(
    `/api/projects/${encodeURIComponent(projectId)}/esign-documents/${encodeURIComponent(documentId)}/ready`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
}

export type SendEsignDocusignResult = {
  envelopeId: string;
  docusignEnvelopeId: string;
  /** Present when API returns extended send payload (older servers may omit). */
  signerEmail?: string;
  carbonCopyEmails?: string[];
  clientSignatureTabCount?: number;
};

export async function sendEsignDocusignApi(
  projectId: string,
  documentId: string,
  body: {
    clientEmail: string;
    clientName?: string | null;
    /** Checklist transaction project when the template lives on the CRM vault. */
    checklistProjectId?: string | null;
    checklistProjectDocumentId?: string | null;
  }
): Promise<SendEsignDocusignResult> {
  const data = await request<SendEsignDocusignResult>(
    `/api/projects/${encodeURIComponent(projectId)}/esign-documents/${encodeURIComponent(documentId)}/send-docusign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientEmail: body.clientEmail,
        clientName: body.clientName ?? undefined,
        checklistProjectId: body.checklistProjectId ?? undefined,
        checklistProjectDocumentId: body.checklistProjectDocumentId ?? undefined,
      }),
    }
  );
  return data;
}

/** Poll DocuSign and import the combined PDF when the envelope is completed (for when Connect webhooks cannot reach your API). */
export async function syncDocusignCompletionApi(
  projectId: string,
  documentId: string
): Promise<{ docusignStatus: string; imported: boolean; signedStoredFileId: string | null }> {
  return request<{ docusignStatus: string; imported: boolean; signedStoredFileId: string | null }>(
    `/api/projects/${encodeURIComponent(projectId)}/esign-documents/${encodeURIComponent(documentId)}/sync-docusign-completion`,
    { method: "POST", headers: { "Content-Type": "application/json" } }
  );
}

export async function deleteEsignDocumentApi(projectId: string, documentId: string): Promise<void> {
  await request<unknown>(`/api/projects/${encodeURIComponent(projectId)}/esign-documents/${encodeURIComponent(documentId)}`, {
    method: "DELETE",
  });
}

export async function deleteEsignDraftsByFileApi(projectId: string, fileId: string): Promise<number> {
  const data = await request<{ deletedCount: number }>(
    `/api/projects/${encodeURIComponent(projectId)}/esign-documents/by-file/${encodeURIComponent(fileId)}`,
    { method: "DELETE" }
  );
  return Number(data.deletedCount ?? 0);
}
