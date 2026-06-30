import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { convertOfficeToPdf } from "./docConversionService.js";
import { absolutePathForStorageKey, insertStoredFile } from "./storedFilesService.js";
import { storageKeyFor } from "../utils/storedFilesLayout.js";

export type EsignFieldInput = {
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

export type EsignRecipientInput = {
  id?: string;
  name?: string;
  email: string;
  role: "vendor" | "client";
  routingOrder: number;
};

export type EsignDocumentRow = {
  id: string;
  projectId: string;
  projectDocumentId: string | null;
  originalFileId: string;
  renderFileId: string | null;
  provider: string | null;
  providerDocumentId: string | null;
  title: string;
  status:
    | "draft_uploaded"
    | "editing"
    | "ready_for_send"
    | "conversion_failed"
    | "sent"
    | "completed"
    | "declined"
    | "voided";
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Populated when DocuSign Connect stored the combined signed PDF for the latest completed envelope. */
  signedStoredFileId: string | null;
};

export type ServiceError = {
  status: number;
  code: string;
  message: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function moveFileSafely(sourceAbs: string, targetAbs: string): void {
  try {
    fs.renameSync(sourceAbs, targetAbs);
    return;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code !== "EXDEV") throw error;
  }
  fs.copyFileSync(sourceAbs, targetAbs);
  fs.unlinkSync(sourceAbs);
}

function mapDocRow(row: Record<string, unknown>): EsignDocumentRow {
  const signedRaw = row.signed_stored_file_id;
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    projectDocumentId: row.project_document_id == null ? null : String(row.project_document_id),
    originalFileId: String(row.original_file_id),
    renderFileId: row.render_file_id == null ? null : String(row.render_file_id),
    provider: row.provider == null ? null : String(row.provider),
    providerDocumentId: row.provider_document_id == null ? null : String(row.provider_document_id),
    title: String(row.title ?? ""),
    status: String(row.status) as EsignDocumentRow["status"],
    createdByUserId: row.created_by_user_id == null ? null : String(row.created_by_user_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    signedStoredFileId:
      signedRaw == null || signedRaw === "" ? null : String(signedRaw),
  };
}

async function requireProjectDocumentBelongs(
  client: PoolClient,
  projectId: number,
  projectDocumentId: number
): Promise<boolean> {
  const { rows } = await client.query<{ ok: string }>(
    `SELECT 1::text AS ok
     FROM public.project_documents
     WHERE id = $1::bigint
       AND project_id = $2::bigint
       AND deleted_at IS NULL
     LIMIT 1`,
    [projectDocumentId, projectId]
  );
  return rows.length > 0;
}

async function requireStoredFileBelongs(client: PoolClient, projectId: number, storedFileId: number): Promise<boolean> {
  const { rows } = await client.query<{ ok: string }>(
    `SELECT 1::text AS ok
     FROM public.stored_files
     WHERE id = $1::bigint
       AND project_id = $2::bigint
       AND deleted_at IS NULL
       AND storage_scope = 'transaction'
     LIMIT 1`,
    [storedFileId, projectId]
  );
  return rows.length > 0;
}

export async function createEsignDraft(
  pool: Pool,
  args: {
    projectId: number;
    projectDocumentId: number | null;
    storedFileId: number;
    title: string;
    createdByUserId: number | null;
    uploadDirAbs: string;
  }
): Promise<{ document: EsignDocumentRow } | { error: ServiceError }> {
  const title = args.title.trim();
  if (!title) {
    return { error: { status: 422, code: "TITLE_REQUIRED", message: "title is required." } };
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const fileBelongs = await requireStoredFileBelongs(client, args.projectId, args.storedFileId);
    if (!fileBelongs) {
      await client.query("ROLLBACK");
      return { error: { status: 404, code: "FILE_NOT_FOUND", message: "Stored file not found in this transaction." } };
    }
    if (args.projectDocumentId !== null) {
      const projectDocBelongs = await requireProjectDocumentBelongs(client, args.projectId, args.projectDocumentId);
      if (!projectDocBelongs) {
        await client.query("ROLLBACK");
        return {
          error: { status: 404, code: "PROJECT_DOCUMENT_NOT_FOUND", message: "Checklist document not found in this transaction." },
        };
      }
    }
    const metaRes = await client.query<{
      storage_key: string;
      mime_type: string;
      name: string;
      folder_id: string | null;
    }>(
      `SELECT storage_key, mime_type, name, folder_id::text
       FROM public.stored_files
       WHERE id = $1::bigint
         AND project_id = $2::bigint
         AND deleted_at IS NULL
       LIMIT 1`,
      [args.storedFileId, args.projectId]
    );
    const meta = metaRes.rows[0];
    if (!meta) {
      await client.query("ROLLBACK");
      return { error: { status: 404, code: "FILE_NOT_FOUND", message: "Stored file not found in this transaction." } };
    }
    const isPdf = meta.mime_type.toLowerCase().includes("pdf") || meta.name.toLowerCase().endsWith(".pdf");

    const { rows } = await client.query<Record<string, unknown>>(
      `INSERT INTO public.esign_documents (
         project_id, project_document_id, original_file_id, render_file_id, provider, provider_document_id,
         title, status, created_by_user_id, created_at, updated_at
       ) VALUES (
         $1::bigint, $2::bigint, $3::bigint, $4::bigint, NULL, NULL,
         $5, 'draft_uploaded', $6::bigint, now(), now()
       )
       RETURNING id::text, project_id::text, project_document_id::text, original_file_id::text, render_file_id::text,
                 provider, provider_document_id, title, status, created_by_user_id::text, created_at, updated_at`,
      [
        args.projectId,
        args.projectDocumentId,
        args.storedFileId,
        isPdf ? args.storedFileId : null,
        title.slice(0, 512),
        args.createdByUserId,
      ]
    );
    const inserted = mapDocRow(rows[0] ?? {});

    if (!isPdf) {
      const inputAbs = absolutePathForStorageKey(args.uploadDirAbs, meta.storage_key);
      const converted = await convertOfficeToPdf(inputAbs);
      const folderId = meta.folder_id ? Number(meta.folder_id) : null;
      const pdfName = `${path.parse(meta.name).name}.pdf`.slice(0, 512);
      const diskName = `${randomUUID()}.pdf`;
      const storageKey = storageKeyFor(args.projectId, folderId, diskName);
      const finalAbs = absolutePathForStorageKey(args.uploadDirAbs, storageKey);
      fs.mkdirSync(path.dirname(finalAbs), { recursive: true });
      const stat = fs.statSync(converted.outputPdfAbs);
      moveFileSafely(converted.outputPdfAbs, finalAbs);

      const stored = await insertStoredFile(client, {
        projectId: args.projectId,
        folderId,
        displayName: pdfName,
        storageKey,
        sizeBytes: stat.size,
        mimeType: "application/pdf",
        uploadedByUserId: args.createdByUserId,
      });
      await client.query(
        `UPDATE public.esign_documents
         SET render_file_id = $1::bigint, updated_at = now()
         WHERE id = $2::bigint`,
        [Number(stored.id), Number(inserted.id)]
      );
      inserted.renderFileId = stored.id;
    } else if (isPdf) {
      await ensureEsignSourceSidecar(args.uploadDirAbs, meta.storage_key);
    }

    await client.query("COMMIT");
    return { document: inserted };
  } catch (error) {
    await client.query("ROLLBACK");
    const msg = error instanceof Error ? error.message : "Could not create e-sign draft.";
    return { error: { status: 500, code: "ESIGN_CREATE_FAILED", message: msg } };
  } finally {
    client.release();
  }
}

export async function listEsignDrafts(pool: Pool, projectId: number): Promise<EsignDocumentRow[]> {
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT ed.id::text,
            ed.project_id::text,
            ed.project_document_id::text,
            ed.original_file_id::text,
            ed.render_file_id::text,
            ed.provider,
            ed.provider_document_id,
            ed.title,
            ed.status,
            ed.created_by_user_id::text,
            ed.created_at,
            ed.updated_at,
            (
              SELECT de.signed_stored_file_id::text
              FROM public.docusign_envelopes de
              WHERE de.esign_document_id = ed.id
                AND de.signed_stored_file_id IS NOT NULL
              ORDER BY de.completed_at DESC NULLS LAST, de.id DESC
              LIMIT 1
            ) AS signed_stored_file_id
     FROM public.esign_documents ed
     WHERE ed.project_id = $1::bigint
       AND ed.deleted_at IS NULL
     ORDER BY ed.updated_at DESC`,
    [projectId]
  );
  return rows.map((r) => mapDocRow(r));
}

export async function getEsignDraft(
  pool: Pool,
  projectId: number,
  esignDocumentId: number
): Promise<
  | {
      document: EsignDocumentRow;
      fields: EsignFieldInput[];
      recipients: EsignRecipientInput[];
    }
  | null
> {
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT ed.id::text,
            ed.project_id::text,
            ed.project_document_id::text,
            ed.original_file_id::text,
            ed.render_file_id::text,
            ed.provider,
            ed.provider_document_id,
            ed.title,
            ed.status,
            ed.created_by_user_id::text,
            ed.created_at,
            ed.updated_at,
            (
              SELECT de.signed_stored_file_id::text
              FROM public.docusign_envelopes de
              WHERE de.esign_document_id = ed.id
                AND de.signed_stored_file_id IS NOT NULL
              ORDER BY de.completed_at DESC NULLS LAST, de.id DESC
              LIMIT 1
            ) AS signed_stored_file_id
     FROM public.esign_documents ed
     WHERE ed.id = $1::bigint
       AND ed.project_id = $2::bigint
       AND ed.deleted_at IS NULL
     LIMIT 1`,
    [esignDocumentId, projectId]
  );
  const doc = rows[0];
  if (!doc) return null;
  const [fieldsRes, recipientsRes] = await Promise.all([
    pool.query<Record<string, unknown>>(
      `SELECT id::text, field_type, role, required, page_number, x, y, width, height, label, prefilled_text, sort_order
       FROM public.esign_document_fields
       WHERE esign_document_id = $1::bigint
       ORDER BY sort_order ASC, id ASC`,
      [esignDocumentId]
    ),
    pool.query<Record<string, unknown>>(
      `SELECT id::text, name, email, role, routing_order
       FROM public.esign_document_recipients
       WHERE esign_document_id = $1::bigint
       ORDER BY routing_order ASC, id ASC`,
      [esignDocumentId]
    ),
  ]);

  return {
    document: mapDocRow(doc),
    fields: fieldsRes.rows.map((row) => ({
      id: String(row.id),
      fieldType: String(row.field_type) as EsignFieldInput["fieldType"],
      role: String(row.role) as EsignFieldInput["role"],
      required: Boolean(row.required),
      pageNumber: Number(row.page_number),
      x: Number(row.x),
      y: Number(row.y),
      width: Number(row.width),
      height: Number(row.height),
      label: row.label == null ? undefined : String(row.label),
      prefilledText: row.prefilled_text == null ? undefined : String(row.prefilled_text),
      sortOrder: Number(row.sort_order),
    })),
    recipients: recipientsRes.rows.map((row) => ({
      id: String(row.id),
      name: row.name == null ? undefined : String(row.name),
      email: String(row.email),
      role: String(row.role) as EsignRecipientInput["role"],
      routingOrder: Number(row.routing_order),
    })),
  };
}

function validateFields(fields: EsignFieldInput[]): ServiceError | null {
  for (const field of fields) {
    if (!["signature", "initials", "text", "date", "checkbox"].includes(field.fieldType)) {
      return { status: 422, code: "INVALID_FIELD_TYPE", message: `Unsupported field type: ${field.fieldType}` };
    }
    if (!["vendor", "client"].includes(field.role)) {
      return { status: 422, code: "INVALID_FIELD_ROLE", message: `Unsupported field role: ${field.role}` };
    }
    if (
      !Number.isFinite(field.pageNumber) ||
      field.pageNumber < 1 ||
      !Number.isFinite(field.x) ||
      field.x < 0 ||
      !Number.isFinite(field.y) ||
      field.y < 0 ||
      !Number.isFinite(field.width) ||
      field.width <= 0 ||
      !Number.isFinite(field.height) ||
      field.height <= 0
    ) {
      return { status: 422, code: "INVALID_FIELD_COORDS", message: "Field coordinates and dimensions are invalid." };
    }
  }
  return null;
}

function validateRecipients(recipients: EsignRecipientInput[]): ServiceError | null {
  for (const recipient of recipients) {
    if (!["vendor", "client"].includes(recipient.role)) {
      return { status: 422, code: "INVALID_RECIPIENT_ROLE", message: `Unsupported recipient role: ${recipient.role}` };
    }
    const email = normalizeEmail(recipient.email);
    if (!isValidEmail(email)) {
      return { status: 422, code: "INVALID_RECIPIENT_EMAIL", message: `Invalid recipient email: ${recipient.email}` };
    }
    if (!Number.isFinite(recipient.routingOrder) || recipient.routingOrder < 1) {
      return { status: 422, code: "INVALID_ROUTING_ORDER", message: "routingOrder must be >= 1." };
    }
  }
  return null;
}

async function assertDraftBelongs(client: PoolClient, projectId: number, esignDocumentId: number): Promise<boolean> {
  const { rows } = await client.query<{ ok: string }>(
    `SELECT 1::text AS ok
     FROM public.esign_documents
     WHERE id = $1::bigint
       AND project_id = $2::bigint
       AND deleted_at IS NULL
     LIMIT 1`,
    [esignDocumentId, projectId]
  );
  return rows.length > 0;
}

async function insertSnapshot(
  client: PoolClient,
  args: { esignDocumentId: number; fields: EsignFieldInput[]; recipients: EsignRecipientInput[]; userId: number | null }
): Promise<void> {
  const versionRes = await client.query<{ next_version: string }>(
    `SELECT COALESCE(MAX(version_no), 0) + 1 AS next_version
     FROM public.esign_document_versions
     WHERE esign_document_id = $1::bigint`,
    [args.esignDocumentId]
  );
  const versionNo = Number(versionRes.rows[0]?.next_version ?? 1);
  await client.query(
    `INSERT INTO public.esign_document_versions (
       esign_document_id, version_no, snapshot_json, saved_by_user_id, created_at
     ) VALUES (
       $1::bigint, $2::int, $3::jsonb, $4::bigint, now()
     )`,
    [
      args.esignDocumentId,
      versionNo,
      JSON.stringify({
        fields: args.fields,
        recipients: args.recipients,
        saved_at: new Date().toISOString(),
      }),
      args.userId,
    ]
  );
}

/**
 * Restores the uploaded PDF from `{path}.esign-source.pdf` when a prior save corrupted the file
 * (common on encrypted brokerage forms). Field positions stay in DB; preview overlays are client-side.
 */
async function restoreOriginalPdfFromSidecar(
  client: PoolClient,
  uploadDirAbs: string,
  projectId: number,
  originalFileId: number
): Promise<void> {
  const metaRes = await client.query<{ storage_key: string; mime_type: string; name: string }>(
    `SELECT storage_key, mime_type, name
     FROM public.stored_files
     WHERE id = $1::bigint AND project_id = $2::bigint AND deleted_at IS NULL
     LIMIT 1`,
    [originalFileId, projectId]
  );
  const meta = metaRes.rows[0];
  if (!meta) return;

  const isPdf = meta.mime_type.toLowerCase().includes("pdf") || meta.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return;

  const abs = absolutePathForStorageKey(uploadDirAbs, meta.storage_key);
  const sidecar = `${abs}.esign-source.pdf`;
  if (!fs.existsSync(sidecar)) return;

  fs.copyFileSync(sidecar, abs);
  const stat = fs.statSync(abs);
  await client.query(
    `UPDATE public.stored_files
     SET size_bytes = $1::bigint, updated_at = now()
     WHERE id = $2::bigint AND project_id = $3::bigint AND deleted_at IS NULL`,
    [stat.size, originalFileId, projectId]
  );
}

async function ensureEsignSourceSidecar(uploadDirAbs: string, storageKey: string): Promise<void> {
  const abs = absolutePathForStorageKey(uploadDirAbs, storageKey);
  if (!fs.existsSync(abs)) return;
  const sidecar = `${abs}.esign-source.pdf`;
  if (!fs.existsSync(sidecar)) {
    fs.copyFileSync(abs, sidecar);
  }
}

export async function repairEsignOriginalPdfFromSidecar(
  pool: Pool,
  uploadDirAbs: string,
  projectId: number,
  esignDocumentId: number
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const docMetaRes = await client.query<{ original_file_id: string }>(
      `SELECT original_file_id::text
       FROM public.esign_documents
       WHERE id = $1::bigint AND project_id = $2::bigint AND deleted_at IS NULL
       LIMIT 1`,
      [esignDocumentId, projectId]
    );
    const originalFileIdRaw = docMetaRes.rows[0]?.original_file_id?.trim() ?? "";
    const originalFileId = /^\d+$/.test(originalFileIdRaw) ? Number(originalFileIdRaw) : NaN;
    if (Number.isFinite(originalFileId)) {
      await restoreOriginalPdfFromSidecar(client, uploadDirAbs, projectId, originalFileId);
    }
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}

export async function saveEsignDraft(
  pool: Pool,
  args: {
    projectId: number;
    esignDocumentId: number;
    fields: EsignFieldInput[];
    recipients?: EsignRecipientInput[];
    autosave: boolean;
    userId: number | null;
    uploadDirAbs: string;
  }
): Promise<{ ok: true } | { error: ServiceError }> {
  const fieldError = validateFields(args.fields);
  if (fieldError) return { error: fieldError };
  const recipients = args.recipients ?? [];
  const recipientError = validateRecipients(recipients);
  if (recipientError) return { error: recipientError };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const belongs = await assertDraftBelongs(client, args.projectId, args.esignDocumentId);
    if (!belongs) {
      await client.query("ROLLBACK");
      return { error: { status: 404, code: "ESIGN_NOT_FOUND", message: "E-sign draft not found." } };
    }

    await client.query(`DELETE FROM public.esign_document_fields WHERE esign_document_id = $1::bigint`, [args.esignDocumentId]);
    await client.query(`DELETE FROM public.esign_document_recipients WHERE esign_document_id = $1::bigint`, [args.esignDocumentId]);

    for (const field of args.fields) {
      await client.query(
        `INSERT INTO public.esign_document_fields (
           esign_document_id, field_type, role, required, page_number, x, y, width, height, label, prefilled_text, sort_order, created_at, updated_at
         ) VALUES (
           $1::bigint, $2, $3, $4, $5::int, $6, $7, $8, $9, $10, $11, $12::int, now(), now()
         )`,
        [
          args.esignDocumentId,
          field.fieldType,
          field.role,
          field.required,
          field.pageNumber,
          field.x,
          field.y,
          field.width,
          field.height,
          field.label?.trim() ? field.label.trim().slice(0, 255) : null,
          field.prefilledText?.trim() ? field.prefilledText.trim() : null,
          field.sortOrder,
        ]
      );
    }

    for (const recipient of recipients) {
      await client.query(
        `INSERT INTO public.esign_document_recipients (
           esign_document_id, name, email, role, routing_order, status, created_at, updated_at
         ) VALUES (
           $1::bigint, $2, $3, $4, $5::int, 'draft', now(), now()
         )`,
        [
          args.esignDocumentId,
          recipient.name?.trim() ? recipient.name.trim().slice(0, 255) : null,
          normalizeEmail(recipient.email).slice(0, 512),
          recipient.role,
          recipient.routingOrder,
        ]
      );
    }

    await client.query(
      `UPDATE public.esign_documents
       SET status = 'editing', updated_at = now()
       WHERE id = $1::bigint`,
      [args.esignDocumentId]
    );

    if (args.autosave) {
      await insertSnapshot(client, {
        esignDocumentId: args.esignDocumentId,
        fields: args.fields,
        recipients,
        userId: args.userId,
      });
    }

    const docMetaRes = await client.query<{ original_file_id: string }>(
      `SELECT original_file_id::text
       FROM public.esign_documents
       WHERE id = $1::bigint AND project_id = $2::bigint AND deleted_at IS NULL
       LIMIT 1`,
      [args.esignDocumentId, args.projectId]
    );
    const originalFileIdRaw = docMetaRes.rows[0]?.original_file_id?.trim() ?? "";
    const originalFileId = /^\d+$/.test(originalFileIdRaw) ? Number(originalFileIdRaw) : NaN;
    if (Number.isFinite(originalFileId)) {
      const keyRes = await client.query<{ storage_key: string }>(
        `SELECT storage_key FROM public.stored_files WHERE id = $1::bigint AND project_id = $2::bigint AND deleted_at IS NULL LIMIT 1`,
        [originalFileId, args.projectId]
      );
      const storageKey = keyRes.rows[0]?.storage_key;
      if (storageKey) {
        await restoreOriginalPdfFromSidecar(client, args.uploadDirAbs, args.projectId, originalFileId);
        await ensureEsignSourceSidecar(args.uploadDirAbs, storageKey);
      }
    }

    await client.query("COMMIT");
    return { ok: true };
  } catch (err) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : "Could not save e-sign draft.";
    const code = msg.includes("pdf") || msg.includes("PDF") ? "ESIGN_PDF_EMBED_FAILED" : "ESIGN_SAVE_FAILED";
    return { error: { status: 500, code, message: msg } };
  } finally {
    client.release();
  }
}

export async function markEsignDraftReady(
  pool: Pool,
  args: { projectId: number; esignDocumentId: number }
): Promise<{ ok: true } | { error: ServiceError }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const belongs = await assertDraftBelongs(client, args.projectId, args.esignDocumentId);
    if (!belongs) {
      await client.query("ROLLBACK");
      return { error: { status: 404, code: "ESIGN_NOT_FOUND", message: "E-sign draft not found." } };
    }

    const fieldRes = await client.query<{ role: string; field_type: string }>(
      `SELECT role::text AS role, field_type::text AS field_type
       FROM public.esign_document_fields
       WHERE esign_document_id = $1::bigint`,
      [args.esignDocumentId]
    );
    if (fieldRes.rows.length < 1) {
      await client.query("ROLLBACK");
      return {
        error: { status: 422, code: "READY_FIELD_REQUIRED", message: "Add at least one field before marking ready." },
      };
    }

    const hasVendorSignature = fieldRes.rows.some((f) => f.role === "vendor" && f.field_type === "signature");
    if (hasVendorSignature) {
      const settingsRes = await client.query<{ vendor_signature_file_id: string | null }>(
        `SELECT vendor_signature_file_id::text AS vendor_signature_file_id
         FROM public.smtp_settings
         WHERE id = 1
         LIMIT 1`
      );
      if (!settingsRes.rows[0]?.vendor_signature_file_id) {
        await client.query("ROLLBACK");
        return {
          error: {
            status: 422,
            code: "VENDOR_SIGNATURE_REQUIRED",
            message: "Upload a vendor signature PNG in Settings → Email / SMTP before marking ready.",
          },
        };
      }
    }

    await client.query(
      `UPDATE public.esign_documents
       SET status = 'ready_for_send', updated_at = now()
       WHERE id = $1::bigint`,
      [args.esignDocumentId]
    );
    await client.query("COMMIT");
    return { ok: true };
  } catch {
    await client.query("ROLLBACK");
    return { error: { status: 500, code: "ESIGN_READY_FAILED", message: "Could not mark draft ready." } };
  } finally {
    client.release();
  }
}

async function esignDeleteBlockedReason(
  pool: Pool,
  projectId: number,
  esignDocumentId: number
): Promise<string | null> {
  const { rows } = await pool.query<{ status: string }>(
    `SELECT status
     FROM public.esign_documents
     WHERE id = $1::bigint
       AND project_id = $2::bigint
     LIMIT 1`,
    [esignDocumentId, projectId]
  );
  const status = rows[0]?.status;
  if (!status) return null;
  if (status === "sent" || status === "completed") {
    return "This eSign template was sent or completed and cannot be deleted.";
  }
  const { rows: envelopeRows } = await pool.query<{ n: string }>(
    `SELECT 1::text AS n
     FROM public.docusign_envelopes
     WHERE esign_document_id = $1::bigint
       AND status IN (
         'sent'::public.docusign_envelope_status,
         'delivered'::public.docusign_envelope_status,
         'completed'::public.docusign_envelope_status
       )
     LIMIT 1`,
    [esignDocumentId]
  );
  if (envelopeRows.length > 0) {
    return "This template has an active DocuSign envelope. Void or complete the envelope before deleting.";
  }
  return null;
}

export async function deleteEsignDraft(
  pool: Pool,
  args: { projectId: number; esignDocumentId: number }
): Promise<{ ok: true } | { error: ServiceError }> {
  const blockReason = await esignDeleteBlockedReason(pool, args.projectId, args.esignDocumentId);
  if (blockReason) {
    return {
      error: {
        status: 409,
        code: "ESIGN_DELETE_BLOCKED",
        message: blockReason,
      },
    };
  }
  const { rowCount } = await pool.query(
    `DELETE FROM public.esign_documents
     WHERE id = $1::bigint
       AND project_id = $2::bigint`,
    [args.esignDocumentId, args.projectId]
  );
  if ((rowCount ?? 0) === 0) {
    return { error: { status: 404, code: "ESIGN_NOT_FOUND", message: "E-sign draft not found." } };
  }
  return { ok: true };
}

export async function patchEsignDraftTitle(
  pool: Pool,
  args: { projectId: number; esignDocumentId: number; title: string }
): Promise<{ document: EsignDocumentRow } | { error: ServiceError }> {
  const title = args.title.trim();
  if (!title) {
    return { error: { status: 422, code: "TITLE_REQUIRED", message: "title is required." } };
  }
  const { rows } = await pool.query<Record<string, unknown>>(
    `UPDATE public.esign_documents
     SET title = $1, updated_at = now()
     WHERE id = $2::bigint
       AND project_id = $3::bigint
       AND deleted_at IS NULL
     RETURNING id::text, project_id::text, project_document_id::text, original_file_id::text, render_file_id::text,
               provider, provider_document_id, title, status, created_by_user_id::text, created_at, updated_at`,
    [title.slice(0, 512), args.esignDocumentId, args.projectId]
  );
  if (!rows[0]) {
    return { error: { status: 404, code: "ESIGN_NOT_FOUND", message: "E-sign draft not found." } };
  }
  return { document: mapDocRow(rows[0]) };
}

export async function deleteEsignDraftsByFile(
  pool: Pool,
  args: { projectId: number; storedFileId: number }
): Promise<{ deletedCount: number } | { error: ServiceError }> {
  const { rows: draftIds } = await pool.query<{ id: string }>(
    `SELECT id::text
     FROM public.esign_documents
     WHERE project_id = $1::bigint
       AND original_file_id = $2::bigint`,
    [args.projectId, args.storedFileId]
  );
  for (const row of draftIds) {
    const blockReason = await esignDeleteBlockedReason(pool, args.projectId, Number(row.id));
    if (blockReason) {
      return {
        error: {
          status: 409,
          code: "ESIGN_DELETE_BLOCKED",
          message: blockReason,
        },
      };
    }
  }
  const result = await pool.query(
    `DELETE FROM public.esign_documents
     WHERE project_id = $1::bigint
       AND original_file_id = $2::bigint`,
    [args.projectId, args.storedFileId]
  );
  return { deletedCount: result.rowCount ?? 0 };
}
