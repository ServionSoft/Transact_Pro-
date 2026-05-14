import type { Request, Response } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import {
  createEsignDraft,
  deleteEsignDraft,
  deleteEsignDraftsByFile,
  getEsignDraft,
  listEsignDrafts,
  markEsignDraftReady,
  saveEsignDraft,
  type EsignFieldInput,
  type EsignRecipientInput,
} from "../services/esignService.js";
import { sendEsignTemplateEnvelope, syncDocuSignCompletionForEsignDocument } from "../services/docusign/docusignEnvelopeService.js";
import { currentUser } from "../middleware/auth.js";

function parseNullableInt(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseFields(raw: unknown): EsignFieldInput[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const row = item as Record<string, unknown>;
      return {
        id: typeof row.id === "string" ? row.id : undefined,
        fieldType:
          typeof row.fieldType === "string"
            ? (row.fieldType as EsignFieldInput["fieldType"])
            : ("signature" as EsignFieldInput["fieldType"]),
        role: typeof row.role === "string" ? (row.role as EsignFieldInput["role"]) : ("client" as EsignFieldInput["role"]),
        required: row.required !== false,
        pageNumber: typeof row.pageNumber === "number" ? row.pageNumber : Number(row.pageNumber ?? 1),
        x: typeof row.x === "number" ? row.x : Number(row.x ?? 0),
        y: typeof row.y === "number" ? row.y : Number(row.y ?? 0),
        width: typeof row.width === "number" ? row.width : Number(row.width ?? 180),
        height: typeof row.height === "number" ? row.height : Number(row.height ?? 40),
        label: typeof row.label === "string" ? row.label : undefined,
        prefilledText: typeof row.prefilledText === "string" ? row.prefilledText : undefined,
        sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
      };
    });
}

function parseRecipients(raw: unknown): EsignRecipientInput[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const row = item as Record<string, unknown>;
      return {
        id: typeof row.id === "string" ? row.id : undefined,
        name: typeof row.name === "string" ? row.name : undefined,
        email: typeof row.email === "string" ? row.email : "",
        role: typeof row.role === "string" ? (row.role as EsignRecipientInput["role"]) : ("client" as EsignRecipientInput["role"]),
        routingOrder: typeof row.routingOrder === "number" ? row.routingOrder : Number(row.routingOrder ?? index + 1),
      };
    });
}

export function createEsignController(pool: Pool, deps: { uploadDirAbs: string; config: AppConfig }) {
  return {
    async create(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const body = (req.body ?? {}) as Record<string, unknown>;
      const storedFileId = parseNullableInt(body.storedFileId);
      if (!storedFileId) {
        res.status(422).json({
          success: false,
          error: { code: "STORED_FILE_REQUIRED", message: "storedFileId is required." },
        });
        return;
      }
      const projectDocumentId = parseNullableInt(body.projectDocumentId);
      const title = typeof body.title === "string" ? body.title : "";
      const userId = parseNullableInt(currentUser(req)?.id ?? null);

      const result = await createEsignDraft(pool, {
        projectId,
        projectDocumentId,
        storedFileId,
        title,
        createdByUserId: userId,
        uploadDirAbs: deps.uploadDirAbs,
      });
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      res.status(201).json({ success: true, data: { document: result.document }, message: "" });
    },

    async list(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const drafts = await listEsignDrafts(pool, projectId);
      res.json({ success: true, data: { documents: drafts }, message: "" });
    },

    async get(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const documentId = Number(req.params.documentId);
      if (!Number.isFinite(documentId) || documentId <= 0) {
        res.status(400).json({ success: false, error: { code: "BAD_ID", message: "Invalid document id." } });
        return;
      }
      const draft = await getEsignDraft(pool, projectId, documentId);
      if (!draft) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Draft not found." } });
        return;
      }
      res.json({ success: true, data: draft, message: "" });
    },

    async save(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const documentId = Number(req.params.documentId);
      if (!Number.isFinite(documentId) || documentId <= 0) {
        res.status(400).json({ success: false, error: { code: "BAD_ID", message: "Invalid document id." } });
        return;
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const fields = parseFields(body.fields);
      const recipients =
        body.recipients === undefined ? [] : body.recipients === null ? null : parseRecipients(body.recipients);
      const autosave = body.autosave === true;
      if (!fields || recipients === null) {
        res.status(422).json({
          success: false,
          error: { code: "INVALID_BODY", message: "fields array is required." },
        });
        return;
      }
      const userId = parseNullableInt(currentUser(req)?.id ?? null);
      const result = await saveEsignDraft(pool, {
        projectId,
        esignDocumentId: documentId,
        fields,
        recipients,
        autosave,
        userId,
        uploadDirAbs: deps.uploadDirAbs,
      });
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      res.json({ success: true, data: { saved: true }, message: "" });
    },

    async markReady(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const documentId = Number(req.params.documentId);
      if (!Number.isFinite(documentId) || documentId <= 0) {
        res.status(400).json({ success: false, error: { code: "BAD_ID", message: "Invalid document id." } });
        return;
      }
      const result = await markEsignDraftReady(pool, { projectId, esignDocumentId: documentId });
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      res.json({ success: true, data: { ready: true }, message: "" });
    },

    async delete(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const documentId = Number(req.params.documentId);
      if (!Number.isFinite(documentId) || documentId <= 0) {
        res.status(400).json({ success: false, error: { code: "BAD_ID", message: "Invalid document id." } });
        return;
      }
      const result = await deleteEsignDraft(pool, { projectId, esignDocumentId: documentId });
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      res.status(204).send();
    },

    async deleteByFile(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const storedFileId = Number(req.params.fileId);
      if (!Number.isFinite(storedFileId)) {
        res.status(400).json({ success: false, error: { code: "BAD_ID", message: "Invalid file id." } });
        return;
      }
      const result = await deleteEsignDraftsByFile(pool, { projectId, storedFileId });
      res.json({ success: true, data: { deletedCount: result.deletedCount }, message: "" });
    },

    async sendDocusign(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const documentId = Number(req.params.documentId);
      if (!Number.isFinite(documentId) || documentId <= 0) {
        res.status(400).json({ success: false, error: { code: "BAD_ID", message: "Invalid document id." } });
        return;
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const clientEmail = typeof body.clientEmail === "string" ? body.clientEmail : "";
      const clientName = typeof body.clientName === "string" ? body.clientName : null;
      const checklistProjectId = parseNullableInt(body.checklistProjectId);
      const checklistProjectDocumentId = parseNullableInt(body.checklistProjectDocumentId);
      const userId = parseNullableInt(currentUser(req)?.id ?? null);
      const uploadDirAbs = deps.uploadDirAbs;
      const result = await sendEsignTemplateEnvelope(pool, deps.config, uploadDirAbs, {
        projectId,
        esignDocumentId: documentId,
        clientEmail,
        clientName,
        userId,
        checklistProjectId,
        checklistProjectDocumentId,
      });
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      res.status(201).json({
        success: true,
        data: {
          envelopeId: result.envelopeId,
          docusignEnvelopeId: result.docusignEnvelopeId,
          signerEmail: result.signerEmail,
          carbonCopyEmails: result.carbonCopyEmails,
          clientSignatureTabCount: result.clientSignatureTabCount,
        },
        message: "",
      });
    },

    async syncDocusignCompletion(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const documentId = Number(req.params.documentId);
      if (!Number.isFinite(documentId) || documentId <= 0) {
        res.status(400).json({ success: false, error: { code: "BAD_ID", message: "Invalid document id." } });
        return;
      }
      const uploadDirAbs = deps.uploadDirAbs;
      const result = await syncDocuSignCompletionForEsignDocument(pool, deps.config, uploadDirAbs, {
        projectId,
        esignDocumentId: documentId,
      });
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      res.json({
        success: true,
        data: {
          docusignStatus: result.docusignStatus,
          imported: result.imported,
          signedStoredFileId: result.signedStoredFileId,
        },
        message: "",
      });
    },
  };
}
