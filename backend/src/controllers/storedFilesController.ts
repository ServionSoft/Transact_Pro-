import fs from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { publicBaseFromRequest } from "../utils/publicBase.js";
import {
  folderBelongsToProject,
  listFolders,
  listFiles,
  mapFileToApiPayload,
  insertStoredFile,
  softDeleteFile,
  updateFileFolder,
  updateFileDisplayName,
  createFolder,
  deleteProjectFolder,
  getFileForDownload,
  absolutePathForStorageKey,
} from "../services/storedFilesService.js";
import { storageKeyFor } from "../utils/storedFilesLayout.js";

export type StoredFilesControllerDeps = {
  pool: Pool;
  config: AppConfig;
  uploadDirAbs: string;
};

export function createStoredFilesController(deps: StoredFilesControllerDeps) {
  const { pool, config, uploadDirAbs } = deps;

  return {
    async list(req: Request, res: Response): Promise<void> {
      try {
        const projectId = res.locals.numericProjectId as number;
        const base = publicBaseFromRequest(req);
        const folders = await listFolders(pool, projectId);
        const files = await listFiles(pool, projectId, base, req.params.projectId ?? "");
        res.json({
          success: true,
          data: {
            files: files.map(mapFileToApiPayload),
            folders,
          },
          message: "",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "List failed";
        res.status(500).json({
          success: false,
          error: { code: "LIST_FAILED", message: msg },
        });
      }
    },

    async uploadStoredFile(req: Request, res: Response): Promise<void> {
      const file = req.file;
      if (!file) {
        res.status(400).json({
          success: false,
          error: { code: "NO_FILE", message: 'Expected multipart field "file".' },
        });
        return;
      }
      const projectId = res.locals.numericProjectId as number;
      const rawFolder = req.body?.folder_id;
      let folderId: number | null = null;
      if (rawFolder != null && String(rawFolder).trim() !== "") {
        const n = Number(String(rawFolder).trim());
        if (!Number.isFinite(n)) {
          fs.unlinkSync(file.path);
          res.status(400).json({
            success: false,
            error: { code: "BAD_FOLDER", message: "folder_id must be a number." },
          });
          return;
        }
        const belongs = await folderBelongsToProject(pool, projectId, n);
        if (!belongs) {
          fs.unlinkSync(file.path);
          res.status(400).json({
            success: false,
            error: { code: "BAD_FOLDER", message: "folder_id does not belong to this project." },
          });
          return;
        }
        folderId = n;
      }

      const storageKey = storageKeyFor(projectId, folderId, file.filename);
      const finalAbs = absolutePathForStorageKey(uploadDirAbs, storageKey);
      try {
        fs.mkdirSync(path.dirname(finalAbs), { recursive: true });
        fs.renameSync(file.path, finalAbs);
      } catch {
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch {
          /* ignore */
        }
        res.status(500).json({
          success: false,
          error: {
            code: "UPLOAD_MOVE_FAILED",
            message: "Could not place uploaded file on disk.",
          },
        });
        return;
      }

      const rawSource = typeof req.body?.source === "string" ? req.body.source.trim() : "";
      const fileSource =
        rawSource === "email_outbound" ? ("email_outbound" as const) : ("manual_upload" as const);

      const displayName = file.originalname.slice(0, 512);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const row = await insertStoredFile(client, {
          projectId,
          folderId,
          displayName,
          storageKey,
          sizeBytes: file.size,
          mimeType: file.mimetype || "application/octet-stream",
          uploadedByUserId: config.defaultUploadUserId ?? null,
          source: fileSource,
        });
        await client.query("COMMIT");
        const base = publicBaseFromRequest(req);
        row.download_url = `${base.replace(/\/+$/, "")}/api/projects/${encodeURIComponent(req.params.projectId ?? "")}/stored-files/${encodeURIComponent(row.id)}/download`;
        res.status(201).json({
          success: true,
          data: { file: mapFileToApiPayload(row) },
          message: "",
        });
      } catch (e) {
        await client.query("ROLLBACK");
        try {
          if (fs.existsSync(finalAbs)) fs.unlinkSync(finalAbs);
        } catch {
          /* ignore */
        }
        const msg = e instanceof Error ? e.message : "Insert failed";
        res.status(500).json({
          success: false,
          error: { code: "UPLOAD_FAILED", message: msg },
        });
      } finally {
        client.release();
      }
    },

    async patchStoredFile(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const fileId = Number(req.params.fileId);
      if (!Number.isFinite(fileId)) {
        res.status(400).json({
          success: false,
          error: { code: "BAD_ID", message: "Invalid file id." },
        });
        return;
      }
      const body = req.body as { folder_id?: unknown; name?: unknown };
      const hasFolderKey = Object.prototype.hasOwnProperty.call(body, "folder_id");
      const nameInBody = typeof body.name === "string" ? body.name : undefined;
      const hasName = Object.prototype.hasOwnProperty.call(body, "name");

      if (!hasFolderKey && !hasName) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Provide folder_id and/or name." },
        });
        return;
      }

      if (hasName) {
        const trimmed = (nameInBody ?? "").trim();
        if (!trimmed) {
          res.status(400).json({
            success: false,
            error: { code: "INVALID_NAME", message: "name must be a non-empty string." },
          });
          return;
        }
      }

      if (hasFolderKey) {
        let folderId: number | null = null;
        if (body.folder_id !== undefined && body.folder_id !== null && String(body.folder_id).trim() !== "") {
          const n = Number(body.folder_id);
          if (!Number.isFinite(n)) {
            res.status(400).json({
              success: false,
              error: { code: "BAD_FOLDER", message: "folder_id must be a number or null." },
            });
            return;
          }
          const belongs = await folderBelongsToProject(pool, projectId, n);
          if (!belongs) {
            res.status(400).json({
              success: false,
              error: { code: "BAD_FOLDER", message: "folder_id does not belong to this project." },
            });
            return;
          }
          folderId = n;
        }
        const okFolder = await updateFileFolder(pool, projectId, fileId, folderId, uploadDirAbs);
        if (!okFolder) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "File not found." },
          });
          return;
        }
      }

      if (hasName) {
        const okName = await updateFileDisplayName(pool, projectId, fileId, nameInBody ?? "");
        if (!okName) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "File not found." },
          });
          return;
        }
      }

      res.status(204).send();
    },

    async deleteStoredFile(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const fileId = Number(req.params.fileId);
      if (!Number.isFinite(fileId)) {
        res.status(400).json({
          success: false,
          error: { code: "BAD_ID", message: "Invalid file id." },
        });
        return;
      }
      try {
        const ok = await softDeleteFile(pool, projectId, fileId, uploadDirAbs);
        if (!ok) {
          res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "File not found." },
          });
          return;
        }
        res.status(204).send();
      } catch (error) {
        const pgCode = (error as { code?: string }).code;
        if (pgCode === "23001") {
          res.status(409).json({
            success: false,
            error: {
              code: "FILE_IN_USE",
              message: "This file is used by an e-sign draft. Remove the draft first, then delete the file.",
            },
          });
          return;
        }
        const message = error instanceof Error ? error.message : "Could not delete file.";
        res.status(500).json({
          success: false,
          error: { code: "DELETE_FAILED", message },
        });
      }
    },

    async downloadStoredFile(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const fileId = Number(req.params.fileId);
      if (!Number.isFinite(fileId)) {
        res.status(400).send("Bad id");
        return;
      }
      const meta = await getFileForDownload(pool, projectId, fileId);
      if (!meta) {
        res.status(404).send("Not found");
        return;
      }
      const abs = absolutePathForStorageKey(uploadDirAbs, meta.storage_key);
      if (!fs.existsSync(abs)) {
        res.status(404).send("File missing on disk");
        return;
      }
      res.setHeader("Content-Type", meta.mime_type || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(meta.name)}"`);
      res.sendFile(abs);
    },

    async deleteFileFolder(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const folderId = Number(req.params.folderId);
      if (!Number.isFinite(folderId)) {
        res.status(400).json({
          success: false,
          error: { code: "BAD_ID", message: "Invalid folder id." },
        });
        return;
      }
      const result = await deleteProjectFolder(pool, projectId, folderId, uploadDirAbs);
      if (result === "not_found") {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Folder not found." },
        });
        return;
      }
      if (result === "has_children") {
        res.status(409).json({
          success: false,
          error: {
            code: "FOLDER_HAS_CHILDREN",
            message: "Delete or move subfolders first.",
          },
        });
        return;
      }
      if (result === "has_files") {
        res.status(409).json({
          success: false,
          error: {
            code: "FOLDER_HAS_FILES",
            message: "Move or delete files in this folder before deleting it.",
          },
        });
        return;
      }
      res.status(204).send();
    },

    async createFileFolder(req: Request, res: Response): Promise<void> {
      const projectId = res.locals.numericProjectId as number;
      const body = req.body as { name?: string; parent_id?: number | null };
      const name = (body.name ?? "").trim();
      if (!name) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION", message: "name is required." },
        });
        return;
      }
      let parentId: number | null = null;
      if (body.parent_id !== undefined && body.parent_id !== null) {
        const p = Number(body.parent_id);
        if (!Number.isFinite(p)) {
          res.status(400).json({
            success: false,
            error: { code: "VALIDATION", message: "parent_id must be a number or null." },
          });
          return;
        }
        const belongs = await folderBelongsToProject(pool, projectId, p);
        if (!belongs) {
          res.status(400).json({
            success: false,
            error: { code: "BAD_PARENT", message: "parent_id is not a folder in this project." },
          });
          return;
        }
        parentId = p;
      }
      try {
        const folder = await createFolder(pool, projectId, name, parentId);
        res.status(201).json({ success: true, data: folder, message: "" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create failed";
        if (msg.includes("unique") || msg.includes("duplicate")) {
          res.status(409).json({
            success: false,
            error: { code: "DUPLICATE", message: "A folder with that name already exists here." },
          });
          return;
        }
        res.status(500).json({
          success: false,
          error: { code: "CREATE_FOLDER_FAILED", message: msg },
        });
      }
    },
  };
}

/** Multer error → 400 JSON (used from route wrapper). */
export function sendMulterError(res: Response, err: Error): void {
  res.status(400).json({
    success: false,
    error: { code: "UPLOAD_BAD_REQUEST", message: err.message || "Upload failed" },
  });
}
