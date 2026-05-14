import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import docusignPkg from "docusign-esign";
import { PDFDocument } from "pdf-lib";

type EnvelopesApiCtor = new (apiClient: object) => {
  createEnvelope(
    accountId: string,
    opts: { envelopeDefinition: Record<string, unknown> },
    callback: (err: Error | null, data: { envelopeId?: string }) => void
  ): Promise<unknown>;
  getEnvelope(
    accountId: string,
    envelopeId: string,
    opts: Record<string, unknown> | null,
    callback: (err: Error | null, data: { status?: string }) => void
  ): Promise<unknown>;
  listRecipients(
    accountId: string,
    envelopeId: string,
    opts: Record<string, string | undefined> | null,
    callback: (err: Error | null, data: unknown) => void
  ): Promise<unknown>;
  getDocument(
    accountId: string,
    envelopeId: string,
    documentId: string,
    opts: Record<string, string> | null,
    callback: (err: Error | null, data: Buffer | string) => void
  ): Promise<unknown>;
};

const docusign = docusignPkg as unknown as { ApiClient: new (opts?: object) => object; EnvelopesApi: EnvelopesApiCtor };
import type { AppConfig } from "../../config/env.js";
import { assertDocusignConfigured, createConfiguredApiClient, getDocusignAccessToken } from "./docusignAuth.js";
import { getEsignDraft, type EsignFieldInput } from "../esignService.js";
import { absolutePathForStorageKey, insertStoredFile } from "../storedFilesService.js";
import { storageKeyFor } from "../../utils/storedFilesLayout.js";
import { stampVendorSignaturesOnPdf } from "./pdfVendorStamp.js";
import { parseSignerEmailsFromInput, validateSignerEmailListForDocuSign } from "../../utils/parseClientSignerEmails.js";

export type ServiceError = { status: number; code: string; message: string };

type DocusignRestErrorShape = {
  errorCode?: string;
  message?: string;
  errors?: Array<{ errorCode?: string; message?: string }>;
  errorDetails?: Array<{ errorCode?: string; message?: string }>;
};

/** Axios / docusign-esign may leave `response.data` as Buffer, UTF-8 JSON string, or parsed object. */
function normalizeAxiosResponseBody(raw: unknown): unknown {
  if (raw == null) return raw;
  if (Buffer.isBuffer(raw)) {
    const t = raw.toString("utf8").trim();
    if (!t) return null;
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return t;
    }
  }
  if (raw instanceof ArrayBuffer) {
    return normalizeAxiosResponseBody(Buffer.from(raw));
  }
  if (ArrayBuffer.isView(raw)) {
    return normalizeAxiosResponseBody(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength));
  }
  return raw;
}

/** Format DocuSign REST error JSON (or JSON string). */
function formatDocusignRestPayload(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    try {
      return formatDocusignRestPayload(JSON.parse(t) as unknown);
    } catch {
      return t.slice(0, 800);
    }
  }
  if (typeof raw !== "object") return null;
  const o = raw as DocusignRestErrorShape & Record<string, unknown>;
  if (o.error && typeof o.error === "object") {
    const inner = formatDocusignRestPayload(o.error);
    if (inner) return inner;
  }
  if (Array.isArray(o.errorDetails) && o.errorDetails.length) {
    const s = o.errorDetails
      .map((row) => {
        const r = row as { errorCode?: string; message?: string };
        const c = r.errorCode ? `${r.errorCode}: ` : "";
        return `${c}${r.message ?? ""}`.trim();
      })
      .filter(Boolean)
      .join("; ");
    if (s) return s;
  }
  if (Array.isArray(o.errors) && o.errors.length) {
    const s = o.errors
      .map((row) => {
        const r = row as Record<string, unknown>;
        const code = (r.errorCode ?? r.ErrorCode ?? "") as string;
        const msg = (r.message ?? r.Message ?? r.longMessage ?? "") as string;
        const c = code ? `${String(code)}: ` : "";
        return `${c}${String(msg)}`.trim();
      })
      .filter(Boolean)
      .join("; ");
    return s || null;
  }
  const title = (o as { title?: unknown }).title;
  if (typeof title === "string" && title.trim()) {
    const c = typeof o.errorCode === "string" ? `${o.errorCode}: ` : "";
    return `${c}${title.trim()}`.trim();
  }
  if (typeof o.message === "string") {
    const c = typeof o.errorCode === "string" ? `${o.errorCode}: ` : "";
    return `${c}${o.message}`.trim();
  }
  if (typeof o.message === "number" || typeof o.message === "boolean") {
    const c = typeof o.errorCode === "string" ? `${o.errorCode}: ` : "";
    return `${c}${String(o.message)}`.trim();
  }
  try {
    const s = JSON.stringify(o);
    if (s.length > 2 && s !== "{}" && s !== "[]") return s.slice(0, 2000);
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * docusign-esign v8 uses axios: failed responses use `error.response.data` (not superagent's `.body`).
 */
function extractDocusignSdkErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const e = err as Error & {
    response?: { status?: number; data?: unknown; body?: unknown; text?: string };
  };
  const status = e.response?.status;
  const candidates = [e.response?.data, e.response?.body, e.response?.text];
  let lastNonEmpty: string | null = null;
  for (const c of candidates) {
    const normalized = normalizeAxiosResponseBody(c);
    const fromPayload = formatDocusignRestPayload(normalized);
    if (fromPayload) return fromPayload;
    if (normalized != null) {
      if (typeof normalized === "string" && normalized.trim()) lastNonEmpty = normalized.trim().slice(0, 1500);
      else if (typeof normalized === "object" && !Buffer.isBuffer(normalized)) {
        try {
          const s = JSON.stringify(normalized);
          if (s.length > 2) lastNonEmpty = s.slice(0, 2000);
        } catch {
          /* ignore */
        }
      }
    }
  }
  if (lastNonEmpty) {
    if (typeof status === "number") return `${lastNonEmpty} (HTTP ${status})`;
    return lastNonEmpty;
  }
  if (typeof status === "number") {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[docusign] createEnvelope failed with no parseable body; status=%s dataType=%s",
        String(status),
        e.response?.data === undefined ? "undefined" : typeof e.response.data
      );
    }
    return `${err.message} (DocuSign HTTP ${status})`;
  }
  return err.message;
}

/** DocuSign REST requires integer tab coordinates (decimals yield INVALID_REQUEST_PARAMETER). */
function tabInt(value: unknown, fallback = 0): number {
  const num = typeof value === "number" ? value : Number(value);
  const n = Number.isFinite(num) ? Math.round(num) : fallback;
  return Math.max(0, n);
}

function tabBase(field: EsignFieldInput): Record<string, string> {
  const page = Math.max(1, tabInt(field.pageNumber, 1));
  return {
    documentId: "1",
    pageNumber: String(page),
    xPosition: String(tabInt(field.x)),
    yPosition: String(tabInt(field.y)),
    width: String(Math.max(1, tabInt(field.width, 180))),
    height: String(Math.max(1, tabInt(field.height, 40))),
  };
}

function buildTabsForRole(fields: EsignFieldInput[], role: "vendor" | "client"): Record<string, unknown[]> {
  const signHereTabs: Record<string, string>[] = [];
  const initialHereTabs: Record<string, string>[] = [];
  const textTabs: Record<string, string>[] = [];
  const dateTabs: Record<string, string>[] = [];
  const checkboxTabs: Record<string, string>[] = [];

  for (const field of fields) {
    if (field.role !== role) continue;
    const base = tabBase(field);
    const optional = field.required ? "false" : "true";
    switch (field.fieldType) {
      case "signature":
        signHereTabs.push({ ...base, optional });
        break;
      case "initials":
        initialHereTabs.push({ ...base, optional });
        break;
      case "text": {
        const t: Record<string, string> = { ...base, optional };
        if (field.prefilledText?.trim()) t.value = field.prefilledText.trim();
        textTabs.push(t);
        break;
      }
      case "date":
        dateTabs.push({ ...base, optional });
        break;
      case "checkbox":
        checkboxTabs.push({ ...base, optional, selected: "false" });
        break;
      default:
        break;
    }
  }

  const tabs: Record<string, unknown[]> = {};
  if (signHereTabs.length) tabs.signHereTabs = signHereTabs;
  if (initialHereTabs.length) tabs.initialHereTabs = initialHereTabs;
  if (textTabs.length) tabs.textTabs = textTabs;
  if (dateTabs.length) tabs.dateTabs = dateTabs;
  if (checkboxTabs.length) tabs.checkboxTabs = checkboxTabs;
  return tabs;
}

function countSignHereTabs(tabs: Record<string, unknown> | undefined): number {
  if (!tabs) return 0;
  const sh = tabs.signHereTabs;
  return Array.isArray(sh) ? sh.length : 0;
}

function summarizeSignerDebugRow(s: Record<string, unknown>): Record<string, unknown> {
  return {
    email: s.email,
    name: s.name,
    recipientId: s.recipientId,
    routingOrder: s.routingOrder,
    roleName: s.roleName,
    clientUserId: s.clientUserId,
    signHereTabCount: countSignHereTabs(s.tabs as Record<string, unknown> | undefined),
    tabKeys: s.tabs && typeof s.tabs === "object" ? Object.keys(s.tabs as object) : [],
  };
}

function summarizeRecipientsFromListApi(data: unknown): unknown {
  if (!data || typeof data !== "object") return { error: "empty_or_invalid_response" };
  const d = data as Record<string, unknown>;
  const out: Record<string, unknown> = {
    currentRoutingOrder: d.currentRoutingOrder,
    recipientCount: d.recipientCount,
  };
  if (Array.isArray(d.signers)) {
    out.signers = d.signers.map((x) => summarizeSignerDebugRow(x as Record<string, unknown>));
  }
  if (Array.isArray(d.carbonCopies)) {
    out.carbonCopies = d.carbonCopies.map((x) => summarizeSignerDebugRow(x as Record<string, unknown>));
  }
  return out;
}

async function createEnvelopeRequest(
  config: AppConfig,
  args: {
    pdfBuffer: Buffer;
    documentName: string;
    emailSubject: string;
    vendorName: string;
    vendorEmail: string;
    clientName: string;
    clientEmail: string;
    /** Fields whose tabs are sent to DocuSign (client-only flow uses client role fields only). */
    tabFields: EsignFieldInput[];
    /** When true: single client signer (vendor signature already on PDF). */
    clientOnly: boolean;
    /** Same routing order as signer so DocuSign emails them when the envelope is sent (not signers). */
    carbonCopies?: { email: string; name: string }[];
    /** Log recipient payload (no PDF) and call listRecipients after create when `config.docusignDebugEnvelope` is true. */
    debugEnvelope?: boolean;
  }
): Promise<{ envelopeId: string }> {
  const accessToken = await getDocusignAccessToken(config);
  const apiClient = createConfiguredApiClient(config, accessToken);
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  const document: Record<string, unknown> = {
    documentBase64: args.pdfBuffer.toString("base64"),
    name: args.documentName.slice(0, 200),
    fileExtension: "pdf",
    documentId: "1",
  };

  const clientTabs = buildTabsForRole(args.tabFields, "client");

  let signers: Record<string, unknown>[];
  if (args.clientOnly) {
    const clientSigner: Record<string, unknown> = {
      email: args.clientEmail,
      name: args.clientName.slice(0, 200),
      recipientId: "1",
      routingOrder: "1",
      tabs: Object.keys(clientTabs).length ? clientTabs : undefined,
    };
    signers = [clientSigner];
  } else {
    const vendorTabs = buildTabsForRole(args.tabFields, "vendor");
    const vendorSigner: Record<string, unknown> = {
      email: args.vendorEmail,
      name: args.vendorName.slice(0, 200),
      recipientId: "1",
      routingOrder: "1",
      tabs: Object.keys(vendorTabs).length ? vendorTabs : undefined,
    };
    const clientSigner: Record<string, unknown> = {
      email: args.clientEmail,
      name: args.clientName.slice(0, 200),
      recipientId: "2",
      routingOrder: "2",
      tabs: Object.keys(clientTabs).length ? clientTabs : undefined,
    };
    signers = [vendorSigner, clientSigner];
  }

  const recipients: Record<string, unknown> = { signers };
  const cc = args.carbonCopies?.filter((c) => c.email?.trim()) ?? [];
  if (cc.length) {
    const startId = signers.length + 1;
    recipients.carbonCopies = cc.map((c, i) => ({
      email: c.email.trim().toLowerCase(),
      name: c.name.trim().slice(0, 200) || c.email.trim().toLowerCase(),
      recipientId: String(startId + i),
      routingOrder: "1",
    }));
  }

  const envelopeDefinition: Record<string, unknown> = {
    emailSubject: args.emailSubject.slice(0, 200),
    status: "sent",
    documents: [document],
    recipients,
  };

  if (args.debugEnvelope) {
    const ccRows = recipients.carbonCopies;
    console.info(
      "[docusign-debug] envelopeDefinition (document base64 omitted)",
      JSON.stringify({
        emailSubject: args.emailSubject.slice(0, 200),
        clientOnly: args.clientOnly,
        document: {
          name: document.name,
          documentId: document.documentId,
          fileExtension: document.fileExtension,
        },
        recipients: {
          signers: signers.map((s) => summarizeSignerDebugRow(s as Record<string, unknown>)),
          carbonCopies: Array.isArray(ccRows)
            ? (ccRows as Record<string, unknown>[]).map((c) => summarizeSignerDebugRow(c))
            : [],
        },
      })
    );
  }

  const summary = await new Promise<{ envelopeId?: string }>((resolve, reject) => {
    envelopesApi.createEnvelope(
      config.docusignAccountId!,
      { envelopeDefinition },
      (err: Error | null, data: { envelopeId?: string }) => {
        if (err) reject(err);
        else resolve(data ?? {});
      }
    );
  });

  const envelopeId = summary?.envelopeId;
  if (!envelopeId) {
    throw new Error("DocuSign did not return an envelope id.");
  }

  if (args.debugEnvelope) {
    await new Promise<void>((resolve) => {
      envelopesApi.listRecipients(
        config.docusignAccountId!,
        envelopeId,
        { includeTabs: "true", includeExtended: "true" },
        (err: Error | null, data: unknown) => {
          if (err) {
            console.warn("[docusign-debug] listRecipients failed:", err.message);
          } else {
            console.info("[docusign-debug] listRecipients:", JSON.stringify(summarizeRecipientsFromListApi(data)));
          }
          resolve();
        }
      );
    });
  }

  return { envelopeId };
}

export async function downloadCombinedPdf(config: AppConfig, docusignEnvelopeId: string): Promise<Buffer> {
  const accessToken = await getDocusignAccessToken(config);
  const apiClient = createConfiguredApiClient(config, accessToken);
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  return new Promise<Buffer>((resolve, reject) => {
    envelopesApi.getDocument(
      config.docusignAccountId!,
      docusignEnvelopeId,
      "combined",
      { certificate: "true" },
      (err: Error | null, data: Buffer | string) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(Buffer.isBuffer(data) ? data : Buffer.from(data as string));
      }
    );
  });
}

async function assertChecklistRowMatchesEsignTemplate(
  pool: Pool,
  checklistProjectId: number,
  checklistProjectDocumentId: number,
  esignDocumentId: number
): Promise<{ ok: true } | { error: ServiceError }> {
  const v = await pool.query(
    `SELECT 1
     FROM public.project_documents pd
     WHERE pd.id = $1::bigint
       AND pd.project_id = $2::bigint
       AND pd.deleted_at IS NULL
       AND pd.esign_document_id = $3::bigint
     LIMIT 1`,
    [checklistProjectDocumentId, checklistProjectId, esignDocumentId]
  );
  if (v.rowCount === 0) {
    return {
      error: {
        status: 422,
        code: "CHECKLIST_ESIGN_MISMATCH",
        message: "Checklist document must be linked to this e-sign template (esign_document_id).",
      },
    };
  }
  return { ok: true };
}

async function fetchDocuSignEnvelopeStatus(config: AppConfig, docusignEnvelopeId: string): Promise<string> {
  const accessToken = await getDocusignAccessToken(config);
  const apiClient = createConfiguredApiClient(config, accessToken);
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  const data = await new Promise<{ status?: string }>((resolve, reject) => {
    envelopesApi.getEnvelope(
      config.docusignAccountId!,
      docusignEnvelopeId,
      {},
      (err: Error | null, envelope: { status?: string }) => {
        if (err) reject(err);
        else resolve(envelope ?? {});
      }
    );
  });
  return String(data.status ?? "unknown");
}

/**
 * Poll DocuSign for envelope status and import the combined PDF when status is `completed`.
 * Use when Connect webhooks cannot reach your server (e.g. localhost) but signing finished in DocuSign.
 */
export async function syncDocuSignCompletionForEsignDocument(
  pool: Pool,
  config: AppConfig,
  uploadDirAbs: string,
  args: { projectId: number; esignDocumentId: number }
): Promise<
  | { ok: true; docusignStatus: string; imported: boolean; signedStoredFileId: string | null }
  | { error: ServiceError }
> {
  try {
    assertDocusignConfigured(config);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DocuSign is not configured.";
    return { error: { status: 503, code: "DOCUSIGN_NOT_CONFIGURED", message: msg } };
  }

  const draft = await getEsignDraft(pool, args.projectId, args.esignDocumentId);
  if (!draft) {
    return { error: { status: 404, code: "ESIGN_NOT_FOUND", message: "E-sign template not found." } };
  }

  const envLookup = await pool.query<{
    id: string;
    docusign_envelope_id: string | null;
    signed_stored_file_id: string | null;
    checklist_project_id: string | null;
    checklist_project_document_id: string | null;
  }>(
    `SELECT id::text,
            docusign_envelope_id::text,
            signed_stored_file_id::text,
            checklist_project_id::text,
            checklist_project_document_id::text
     FROM public.docusign_envelopes
     WHERE esign_document_id = $1::bigint
       AND project_id = $2::bigint
       AND docusign_envelope_id IS NOT NULL
     ORDER BY id DESC
     LIMIT 1`,
    [args.esignDocumentId, args.projectId]
  );
  const envRow = envLookup.rows[0];
  if (!envRow?.docusign_envelope_id) {
    return {
      error: {
        status: 422,
        code: "NO_DOCUSIGN_ENVELOPE",
        message: "No DocuSign envelope is recorded for this template. Send an envelope first.",
      },
    };
  }
  if (envRow.signed_stored_file_id) {
    return {
      ok: true,
      docusignStatus: "completed",
      imported: false,
      signedStoredFileId: envRow.signed_stored_file_id,
    };
  }

  const docusignEnvelopeId = envRow.docusign_envelope_id.trim();
  let remoteStatus: string;
  try {
    remoteStatus = await fetchDocuSignEnvelopeStatus(config, docusignEnvelopeId);
  } catch (err) {
    return {
      error: {
        status: 502,
        code: "DOCUSIGN_STATUS_FAILED",
        message: extractDocusignSdkErrorMessage(err),
      },
    };
  }

  const norm = remoteStatus.trim().toLowerCase();
  if (norm !== "completed") {
    return { ok: true, docusignStatus: remoteStatus, imported: false, signedStoredFileId: null };
  }

  const internalId = Number(envRow.id);
  const envChecklistProj = envRow.checklist_project_id ? Number(envRow.checklist_project_id) : null;
  const envChecklistPd = envRow.checklist_project_document_id ? Number(envRow.checklist_project_document_id) : null;
  let storedFileProjectId = args.projectId;
  let checklistProjectId: number | null = null;
  let checklistProjectDocumentId: number | null = null;
  if (envChecklistProj != null && envChecklistPd != null) {
    storedFileProjectId = envChecklistProj;
    checklistProjectId = envChecklistProj;
    checklistProjectDocumentId = envChecklistPd;
  } else if (draft.document.projectDocumentId) {
    checklistProjectDocumentId = Number(draft.document.projectDocumentId);
    checklistProjectId = args.projectId;
    storedFileProjectId = args.projectId;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    try {
      await storeSignedPdfAndFinalize(client, config, uploadDirAbs, {
        internalEnvelopeId: internalId,
        docusignEnvelopeId,
        esignDocumentId: args.esignDocumentId,
        storedFileProjectId,
        checklistProjectId,
        checklistProjectDocumentId,
        uploadedByUserId: null,
      });
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      const msg = e instanceof Error ? e.message : "Could not import signed PDF.";
      return { error: { status: 502, code: "IMPORT_SIGNED_PDF_FAILED", message: msg } };
    }
  } finally {
    client.release();
  }

  const after = await pool.query<{ signed: string | null }>(
    `SELECT signed_stored_file_id::text AS signed FROM public.docusign_envelopes WHERE id = $1::bigint`,
    [internalId]
  );
  return {
    ok: true,
    docusignStatus: remoteStatus,
    imported: true,
    signedStoredFileId: after.rows[0]?.signed ?? null,
  };
}

export function verifyConnectHmac(config: AppConfig, rawBody: Buffer, headerSig: string | undefined): boolean {
  const secret = config.docusignConnectHmacKey;
  if (!secret) {
    return config.nodeEnv !== "production";
  }
  if (!headerSig) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(headerSig);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function extractEnvelopeIdFromConnectJson(json: Record<string, unknown>): string | null {
  const tryId = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length >= 32 ? t : null;
  };
  const direct = tryId(json.envelopeId);
  if (direct) return direct;
  const data = json.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const fromData = tryId(d.envelopeId);
    if (fromData) return fromData;
    const summary = d.envelopeSummary;
    if (summary && typeof summary === "object") {
      const sid = tryId((summary as Record<string, unknown>).envelopeId);
      if (sid) return sid;
    }
  }
  return null;
}

/** DocuSign Connect JSON/XML event names vary slightly by configuration. */
function isEnvelopeCompletedEvent(event: string | null): boolean {
  if (!event) return false;
  const n = event.trim().toLowerCase().replace(/_/g, "-");
  return n === "envelope-completed" || n === "envelopecompleted";
}

function extractEnvelopeIdLooseFromText(text: string): string | null {
  const quoted = text.match(/"envelopeId"\s*:\s*"([^"]+)"/i);
  if (quoted?.[1]) return quoted[1].trim();
  const xml = text.match(/<EnvelopeID[^>]*>([^<]+)<\/EnvelopeID>/i);
  return xml?.[1]?.trim() ?? null;
}

function parseEnvelopeIdFromConnectBody(rawBody: Buffer): { event: string | null; envelopeId: string | null } {
  const text = rawBody.toString("utf8").trim();
  if (!text) return { event: null, envelopeId: null };
  if (text.startsWith("{")) {
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      const event =
        typeof json.event === "string"
          ? json.event
          : typeof json.Event === "string"
            ? json.Event
            : null;
      let envelopeId = extractEnvelopeIdFromConnectJson(json);
      if (!envelopeId) {
        envelopeId = extractEnvelopeIdLooseFromText(text);
      }
      return { event, envelopeId };
    } catch {
      return {
        event: null,
        envelopeId: extractEnvelopeIdLooseFromText(text),
      };
    }
  }
  const ev = text.match(/<Event>([^<]+)<\/Event>/i);
  const id = text.match(/<EnvelopeID[^>]*>([^<]+)<\/EnvelopeID>/i);
  return { event: ev?.[1]?.trim() ?? null, envelopeId: id?.[1]?.trim() ?? null };
}

async function storeSignedPdfAndFinalize(
  client: PoolClient,
  config: AppConfig,
  uploadDirAbs: string,
  args: {
    internalEnvelopeId: number;
    docusignEnvelopeId: string;
    esignDocumentId: number;
    /** Project that owns the signed PDF row (usually the transaction when sending from checklist). */
    storedFileProjectId: number;
    checklistProjectId: number | null;
    checklistProjectDocumentId: number | null;
    uploadedByUserId: number | null;
  }
): Promise<void> {
  const pdf = await downloadCombinedPdf(config, args.docusignEnvelopeId);

  const folderRes = await client.query<{ folder_id: string | null }>(
    `SELECT folder_id::text
     FROM public.stored_files
     WHERE id = (
       SELECT COALESCE(render_file_id, original_file_id) FROM public.esign_documents WHERE id = $1::bigint
     )
     LIMIT 1`,
    [args.esignDocumentId]
  );
  let folderId = folderRes.rows[0]?.folder_id ? Number(folderRes.rows[0].folder_id) : null;
  if (folderId != null) {
    const fProj = await client.query<{ project_id: string }>(
      `SELECT project_id::text FROM public.project_folders WHERE id = $1::bigint LIMIT 1`,
      [folderId]
    );
    const fp = fProj.rows[0]?.project_id ? Number(fProj.rows[0].project_id) : null;
    if (fp != null && fp !== args.storedFileProjectId) {
      folderId = null;
    }
  }

  const titleRes = await client.query<{ title: string }>(
    `SELECT title FROM public.esign_documents WHERE id = $1::bigint`,
    [args.esignDocumentId]
  );
  const baseTitle = titleRes.rows[0]?.title?.trim() || "signed";
  const safeName = `${baseTitle.replace(/[\\/:*?"<>|]+/g, "_")}-signed.pdf`.slice(0, 512);
  const diskName = `${randomUUID()}.pdf`;
  const storageKey = storageKeyFor(args.storedFileProjectId, folderId, diskName);
  const abs = absolutePathForStorageKey(uploadDirAbs, storageKey);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, pdf);

  const stored = await insertStoredFile(client, {
    projectId: args.storedFileProjectId,
    folderId,
    displayName: safeName,
    storageKey,
    sizeBytes: pdf.length,
    mimeType: "application/pdf",
    uploadedByUserId: args.uploadedByUserId,
    source: "docusign_signed_return",
  });

  await client.query(
    `UPDATE public.docusign_envelopes
     SET status = 'completed'::public.docusign_envelope_status,
         signed_stored_file_id = $1::bigint,
         completed_at = now(),
         updated_at = now()
     WHERE id = $2::bigint`,
    [Number(stored.id), args.internalEnvelopeId]
  );

  /* Library templates are reused across transactions; keep the layout sendable after each import. */
  await client.query(
    `UPDATE public.esign_documents
     SET status = 'ready_for_send',
         provider = NULL,
         provider_document_id = NULL,
         updated_at = now()
     WHERE id = $1::bigint`,
    [args.esignDocumentId]
  );

  const pdId = args.checklistProjectDocumentId;
  const pdProj = args.checklistProjectId;
  if (pdId != null && pdProj != null) {
    await client.query(
      `UPDATE public.project_documents
       SET status = 'completed'::public.document_status,
           current_file_id = $1::bigint,
           updated_at = now()
       WHERE id = $2::bigint AND project_id = $3::bigint`,
      [Number(stored.id), pdId, pdProj]
    );

    await client.query(
      `UPDATE public.project_document_files SET is_primary = false WHERE project_document_id = $1::bigint AND is_primary = true`,
      [pdId]
    );
    await client.query(
      `INSERT INTO public.project_document_files (
         project_document_id, stored_file_id, sort_order, label, is_primary, created_at, updated_at
       )
       VALUES ($1::bigint, $2::bigint, 0, $3, true, now(), now())`,
      [pdId, Number(stored.id), "Signed (DocuSign)"]
    );
  }
}

export async function processDocuSignConnectPayload(
  pool: Pool,
  config: AppConfig,
  uploadDirAbs: string,
  rawBody: Buffer,
  rawEventForLog: string
): Promise<void> {
  const { event, envelopeId } = parseEnvelopeIdFromConnectBody(rawBody);
  if (!envelopeId) {
    if (rawBody.length > 20) {
      // eslint-disable-next-line no-console
      console.warn("[docusign connect] payload received but envelopeId could not be parsed.");
    }
    return;
  }

  const client = await pool.connect();
  try {
    const envRow = await client.query<{
      id: string;
      esign_document_id: string | null;
      project_id: string;
      signed_stored_file_id: string | null;
      checklist_project_id: string | null;
      checklist_project_document_id: string | null;
    }>(
      `SELECT id::text,
              esign_document_id::text,
              project_id::text,
              signed_stored_file_id::text,
              checklist_project_id::text,
              checklist_project_document_id::text
       FROM public.docusign_envelopes
       WHERE lower(trim(docusign_envelope_id)) = lower(trim($1))
       LIMIT 1`,
      [envelopeId]
    );
    const row = envRow.rows[0];
    if (!row) {
      // eslint-disable-next-line no-console
      console.warn("[docusign connect] envelopeId not in database:", envelopeId);
      return;
    }

    const internalId = Number(row.id);
    await client.query(
      `INSERT INTO public.docusign_webhook_events (envelope_id, event_type, raw_payload, received_at, created_at)
       VALUES ($1::bigint, $2, $3::jsonb, now(), now())`,
      [internalId, event ?? "unknown", JSON.stringify({ event, body: rawEventForLog.slice(0, 50_000) })]
    );

    const evNorm = (event ?? "").trim().toLowerCase().replace(/_/g, "-");
    if (evNorm === "envelope-declined" || evNorm === "recipient-declined" || evNorm === "recipientdeclined") {
      await client.query(
        `UPDATE public.docusign_envelopes SET status = 'declined'::public.docusign_envelope_status, updated_at = now() WHERE id = $1::bigint`,
        [internalId]
      );
      if (row.esign_document_id) {
        await client.query(`UPDATE public.esign_documents SET status = 'declined', updated_at = now() WHERE id = $1::bigint`, [
          Number(row.esign_document_id),
        ]);
      }
      return;
    }

    if (evNorm === "envelope-voided" || evNorm === "envelopevoided") {
      await client.query(
        `UPDATE public.docusign_envelopes SET status = 'voided'::public.docusign_envelope_status, updated_at = now() WHERE id = $1::bigint`,
        [internalId]
      );
      if (row.esign_document_id) {
        await client.query(`UPDATE public.esign_documents SET status = 'voided', updated_at = now() WHERE id = $1::bigint`, [
          Number(row.esign_document_id),
        ]);
      }
      return;
    }

    if (!isEnvelopeCompletedEvent(event)) {
      return;
    }

    if (row.signed_stored_file_id) {
      return;
    }
    if (!row.esign_document_id) {
      return;
    }

    const esignId = Number(row.esign_document_id);
    const envelopeProjectId = Number(row.project_id);

    const cp = row.checklist_project_id ? Number(row.checklist_project_id) : null;
    const cpd = row.checklist_project_document_id ? Number(row.checklist_project_document_id) : null;

    let storedFileProjectId = envelopeProjectId;
    let checklistProjectId: number | null = null;
    let checklistProjectDocumentId: number | null = null;

    if (cp != null && cpd != null) {
      storedFileProjectId = cp;
      checklistProjectId = cp;
      checklistProjectDocumentId = cpd;
    } else {
      const docMeta = await client.query<{ project_document_id: string | null }>(
        `SELECT project_document_id::text FROM public.esign_documents WHERE id = $1::bigint`,
        [esignId]
      );
      const fromEsign = docMeta.rows[0]?.project_document_id ? Number(docMeta.rows[0].project_document_id) : null;
      if (fromEsign != null) {
        checklistProjectId = envelopeProjectId;
        checklistProjectDocumentId = fromEsign;
        storedFileProjectId = envelopeProjectId;
      }
    }

    await client.query("BEGIN");
    try {
      await storeSignedPdfAndFinalize(client, config, uploadDirAbs, {
        internalEnvelopeId: internalId,
        docusignEnvelopeId: envelopeId,
        esignDocumentId: esignId,
        storedFileProjectId,
        checklistProjectId,
        checklistProjectDocumentId,
        uploadedByUserId: null,
      });
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  } finally {
    client.release();
  }
}

export async function sendEsignTemplateEnvelope(
  pool: Pool,
  config: AppConfig,
  uploadDirAbs: string,
  args: {
    projectId: number;
    esignDocumentId: number;
    clientEmail: string;
    clientName: string | null;
    userId: number | null;
    /** Transaction (or other) project that owns the checklist row when the template lives on the vault. */
    checklistProjectId?: number | null;
    checklistProjectDocumentId?: number | null;
  }
): Promise<
  | {
      envelopeId: string;
      docusignEnvelopeId: string;
      signerEmail: string;
      carbonCopyEmails: string[];
      clientSignatureTabCount: number;
    }
  | { error: ServiceError }
> {
  try {
    assertDocusignConfigured(config);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DocuSign is not configured.";
    return { error: { status: 503, code: "DOCUSIGN_NOT_CONFIGURED", message: msg } };
  }

  const draft = await getEsignDraft(pool, args.projectId, args.esignDocumentId);
  if (!draft) {
    return { error: { status: 404, code: "ESIGN_NOT_FOUND", message: "E-sign template not found." } };
  }
  const st = draft.document.status;
  if (st !== "ready_for_send" && st !== "completed") {
    return {
      error: {
        status: 422,
        code: "ESIGN_NOT_READY",
        message: "Mark the template ready for send before creating a DocuSign envelope.",
      },
    };
  }

  const rawChecklistProj = args.checklistProjectId ?? null;
  const rawChecklistPd = args.checklistProjectDocumentId ?? null;
  if ((rawChecklistProj == null) !== (rawChecklistPd == null)) {
    return {
      error: {
        status: 422,
        code: "CHECKLIST_CONTEXT_INCOMPLETE",
        message: "checklistProjectId and checklistProjectDocumentId must both be provided or both omitted.",
      },
    };
  }
  let checklistProjectId: number | null = rawChecklistProj;
  let checklistProjectDocumentId: number | null = rawChecklistPd;
  if (checklistProjectId != null && checklistProjectDocumentId != null) {
    const chk = await assertChecklistRowMatchesEsignTemplate(
      pool,
      checklistProjectId,
      checklistProjectDocumentId,
      args.esignDocumentId
    );
    if ("error" in chk) return chk;
  }
  if (checklistProjectDocumentId == null && draft.document.projectDocumentId) {
    checklistProjectDocumentId = Number(draft.document.projectDocumentId);
    checklistProjectId = args.projectId;
  }

  const renderId = draft.document.renderFileId ?? draft.document.originalFileId;
  if (!renderId) {
    return { error: { status: 422, code: "ESIGN_NO_PDF", message: "Template has no PDF file to send." } };
  }

  const dbClient = await pool.connect();
  let smtp: { from_name: string | null; from_email: string; vendor_signature_file_id: string | null } | null = null;
  try {
    const smtpRes = await dbClient.query<{
      from_name: string | null;
      from_email: string;
      vendor_signature_file_id: string | null;
    }>(
      `SELECT from_name, from_email, vendor_signature_file_id::text AS vendor_signature_file_id
       FROM public.smtp_settings WHERE id = 1 LIMIT 1`
    );
    smtp = smtpRes.rows[0] ?? null;
  } finally {
    dbClient.release();
  }

  const vendorEmail = smtp?.from_email?.trim() ?? "";
  const vendorName = (smtp?.from_name?.trim() || vendorEmail || "Vendor").slice(0, 200);
  if (!vendorEmail) {
    return {
      error: { status: 422, code: "VENDOR_EMAIL_REQUIRED", message: "Configure SMTP From email before sending." },
    };
  }

  const parsedEmails = parseSignerEmailsFromInput(args.clientEmail);
  if (parsedEmails.length === 0) {
    return {
      error: {
        status: 422,
        code: "INVALID_CLIENT_EMAIL",
        message:
          "Enter at least one valid email. Use comma, semicolon, or newline between addresses. Extra addresses are carbon copies (they do not sign).",
      },
    };
  }

  const strictEmails = validateSignerEmailListForDocuSign(parsedEmails);
  if (!strictEmails.ok) {
    return { error: { status: 422, code: "INVALID_CLIENT_EMAIL", message: strictEmails.message } };
  }

  const email = parsedEmails[0];
  if (vendorEmail.toLowerCase() === email) {
    return {
      error: {
        status: 422,
        code: "SIGNERS_MUST_DIFFER",
        message: "The signing client email must differ from the vendor (SMTP From) email for DocuSign routing.",
      },
    };
  }

  const vendorLower = vendorEmail.toLowerCase();
  const carbonCopyEmails = parsedEmails
    .slice(1)
    .filter((e) => e !== email && e !== vendorLower)
    .slice(0, 50);

  const fileClient = await pool.connect();
  let pdfPath: string;
  try {
    const keyRes = await fileClient.query<{ storage_key: string }>(
      `SELECT storage_key FROM public.stored_files WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
      [Number(renderId)]
    );
    const key = keyRes.rows[0]?.storage_key;
    if (!key) {
      return { error: { status: 404, code: "FILE_NOT_FOUND", message: "PDF storage key not found." } };
    }
    pdfPath = absolutePathForStorageKey(uploadDirAbs, key);
    if (!fs.existsSync(pdfPath)) {
      return { error: { status: 500, code: "FILE_MISSING_ON_DISK", message: "PDF file missing on server." } };
    }
  } finally {
    fileClient.release();
  }

  let pdfBuffer = fs.readFileSync(pdfPath);
  const vendorStampFields = draft.fields.filter((f) => f.role === "vendor" && f.fieldType === "signature");
  const clientTabFields = draft.fields.filter((f) => f.role === "client");
  if (vendorStampFields.length) {
    const sigFileId = smtp?.vendor_signature_file_id ? Number(smtp.vendor_signature_file_id) : NaN;
    if (!Number.isFinite(sigFileId)) {
      return {
        error: {
          status: 422,
          code: "VENDOR_SIGNATURE_FILE_MISSING",
          message: "Upload vendor signature PNG in SMTP settings before sending.",
        },
      };
    }
    const sigClient = await pool.connect();
    let sigBytes: Buffer;
    try {
      const sigKeyRes = await sigClient.query<{ storage_key: string }>(
        `SELECT storage_key FROM public.stored_files WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
        [sigFileId]
      );
      const sigKey = sigKeyRes.rows[0]?.storage_key;
      if (!sigKey) {
        return { error: { status: 404, code: "VENDOR_SIG_FILE_NOT_FOUND", message: "Vendor signature file not found." } };
      }
      const sigPath = absolutePathForStorageKey(uploadDirAbs, sigKey);
      if (!fs.existsSync(sigPath)) {
        return { error: { status: 500, code: "VENDOR_SIG_MISSING_ON_DISK", message: "Vendor signature file missing on server." } };
      }
      sigBytes = fs.readFileSync(sigPath);
    } finally {
      sigClient.release();
    }
    try {
      const stamped = await stampVendorSignaturesOnPdf(pdfBuffer, sigBytes, vendorStampFields);
      pdfBuffer = Buffer.from(stamped);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not merge vendor signature into PDF.";
      return { error: { status: 500, code: "PDF_STAMP_FAILED", message: msg } };
    }
  }

  let pdfPageCount = 0;
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    pdfPageCount = pdfDoc.getPageCount();
  } catch {
    /* invalid PDF — DocuSign will reject; no local page check */
  }
  if (pdfPageCount > 0) {
    const tabFieldsForPages = [...clientTabFields, ...vendorStampFields];
    const bad = tabFieldsForPages
      .map((f) => ({ field: f, page: tabInt(f.pageNumber, 1) }))
      .filter(({ page }) => page < 1 || page > pdfPageCount);
    if (bad.length) {
      const p = bad[0].page;
      return {
        error: {
          status: 422,
          code: "TAB_PAGE_OUT_OF_RANGE",
          message: `This PDF has ${pdfPageCount} page(s), but a signature field targets page ${p}. Open the eSign template builder, switch to that page in the preview, and move the field onto a page that exists (1–${pdfPageCount}).`,
        },
      };
    }
  }

  const clientTabsPreview = buildTabsForRole(clientTabFields, "client");
  const signHereTabs = clientTabsPreview.signHereTabs;
  if (!Array.isArray(signHereTabs) || signHereTabs.length === 0) {
    return {
      error: {
        status: 422,
        code: "CLIENT_SIGNATURE_TAB_REQUIRED",
        message:
          "Add at least one client (Assignee: client) signature field on the template before sending. DocuSign requires a signature tab for the signer.",
      },
    };
  }

  const clientDisp = (args.clientName?.trim() || email).slice(0, 200);

  let docusignEnvelopeId: string;
  try {
    const created = await createEnvelopeRequest(config, {
      pdfBuffer,
      documentName: draft.document.title,
      emailSubject: `Please sign: ${draft.document.title}`,
      vendorName,
      vendorEmail,
      clientName: clientDisp,
      clientEmail: email,
      tabFields: clientTabFields,
      clientOnly: true,
      carbonCopies: carbonCopyEmails.map((e) => ({
        email: e,
        name: (e.split("@")[0] || e).slice(0, 200),
      })),
      debugEnvelope: config.docusignDebugEnvelope,
    });
    docusignEnvelopeId = created.envelopeId;
  } catch (err) {
    const msg = extractDocusignSdkErrorMessage(err) || "DocuSign create envelope failed.";
    return { error: { status: 502, code: "DOCUSIGN_ENVELOPE_FAILED", message: msg } };
  }

  const tx = await pool.connect();
  try {
    await tx.query("BEGIN");
    const ins = await tx.query<{ id: string }>(
      `INSERT INTO public.docusign_envelopes (
         project_id, docusign_envelope_id, status, esign_document_id,
         sent_by_user_id, sent_at, checklist_project_id, checklist_project_document_id,
         created_at, updated_at
       ) VALUES (
         $1::bigint, $2, 'sent'::public.docusign_envelope_status, $3::bigint,
         $4::bigint, now(), $5::bigint, $6::bigint,
         now(), now()
       )
       RETURNING id::text`,
      [
        args.projectId,
        docusignEnvelopeId,
        args.esignDocumentId,
        args.userId,
        checklistProjectId,
        checklistProjectDocumentId,
      ]
    );
    const internalId = ins.rows[0]?.id;
    if (!internalId) {
      await tx.query("ROLLBACK");
      return { error: { status: 500, code: "ENVELOPE_DB_FAILED", message: "Could not store envelope row." } };
    }

    if (checklistProjectDocumentId != null && checklistProjectId != null) {
      await tx.query(
        `INSERT INTO public.docusign_envelope_documents (envelope_id, project_document_id, created_at, updated_at)
         VALUES ($1::bigint, $2::bigint, now(), now())
         ON CONFLICT ON CONSTRAINT docusign_envelope_documents_envelope_id_project_document_id_key DO NOTHING`,
        [Number(internalId), checklistProjectDocumentId]
      );
    }

    await tx.query(
      `INSERT INTO public.docusign_envelope_recipients (
         envelope_id, email, name, role, routing_order, status, created_at, updated_at
       ) VALUES
         ($1::bigint, $2, $3, 'client'::public.docusign_field_role, 1, 'sent'::public.docusign_recipient_status, now(), now())`,
      [Number(internalId), email, clientDisp]
    );

    await tx.query(
      `UPDATE public.esign_documents
       SET status = 'sent',
           provider = 'docusign',
           provider_document_id = $2,
           updated_at = now()
       WHERE id = $1::bigint`,
      [args.esignDocumentId, docusignEnvelopeId]
    );

    if (checklistProjectDocumentId != null && checklistProjectId != null) {
      await tx.query(
        `UPDATE public.project_documents
         SET status = 'out_for_signature'::public.document_status,
             updated_at = now()
         WHERE id = $1::bigint AND project_id = $2::bigint`,
        [checklistProjectDocumentId, checklistProjectId]
      );
    }

    await tx.query("COMMIT");
    return {
      envelopeId: internalId,
      docusignEnvelopeId,
      signerEmail: email,
      carbonCopyEmails,
      clientSignatureTabCount: Array.isArray(signHereTabs) ? signHereTabs.length : 0,
    };
  } catch (e) {
    await tx.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : "Database error after DocuSign send.";
    return { error: { status: 500, code: "ENVELOPE_PERSIST_FAILED", message: msg } };
  } finally {
    tx.release();
  }
}
