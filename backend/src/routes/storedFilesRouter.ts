import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createStoredFilesController, sendMulterError } from "../controllers/storedFilesController.js";
import { requireAuth, requirePermission, requireProjectAccess } from "../middleware/auth.js";
import { requirePool, resolveProjectMiddleware } from "../middleware/storedProject.js";
import { createStoredFileMulter } from "../middleware/storedFilesUpload.js";

export function registerStoredFilesRoutes(
  app: Express,
  config: AppConfig,
  pool: Pool | null
): void {
  const router = Router();
  const uploadDirAbs = path.resolve(config.uploadDir);
  fs.mkdirSync(uploadDirAbs, { recursive: true });

  if (!pool) {
    router.use(requirePool(null));
    app.use("/api/projects", router);
    return;
  }

  const upload = createStoredFileMulter(uploadDirAbs, config).single("file");
  const ctrl = createStoredFilesController({ pool, config, uploadDirAbs });
  const requireDb = requirePool(pool);
  const auth = requireAuth(config, pool);
  const resolveProject = resolveProjectMiddleware(config, pool);
  const projectAccess = requireProjectAccess(pool);
  const docView = requirePermission(pool, "documents.view");
  const docUpload = requirePermission(pool, "documents.upload");
  const docMove = requirePermission(pool, "documents.move");
  const docDelete = requirePermission(pool, "documents.delete");
  const docDownload = requirePermission(pool, "documents.download");
  const folderCreate = requirePermission(pool, "documents.folders.create");
  const folderDelete = requirePermission(pool, "documents.folders.delete");

  router.get("/:projectId/stored-files", requireDb, auth, docView, resolveProject, projectAccess, (req, res) => {
    void ctrl.list(req, res);
  });

  router.post(
    "/:projectId/stored-files",
    requireDb,
    auth,
    docUpload,
    resolveProject,
    projectAccess,
    (req, res, next) => {
      upload(req as any, res as any, (err) => {
        if (err) {
          sendMulterError(res, err instanceof Error ? err : new Error(String(err)));
          return;
        }
        next();
      });
    },
    (req, res) => {
      void ctrl.uploadStoredFile(req, res);
    }
  );

  /** JSON body: `{ folder_id?: number | string | null }` move; `{ name?: string }` rename display name; both allowed. */
  router.patch("/:projectId/stored-files/:fileId", requireDb, auth, docMove, resolveProject, projectAccess, (req, res) => {
    void ctrl.patchStoredFile(req, res);
  });

  router.delete("/:projectId/stored-files/:fileId", requireDb, auth, docDelete, resolveProject, projectAccess, (req, res) => {
    void ctrl.deleteStoredFile(req, res);
  });

  router.get("/:projectId/stored-files/:fileId/download", requireDb, auth, docDownload, resolveProject, projectAccess, (req, res) => {
    void ctrl.downloadStoredFile(req, res);
  });

  router.post("/:projectId/file-folders", requireDb, auth, folderCreate, resolveProject, projectAccess, (req, res) => {
    void ctrl.createFileFolder(req, res);
  });

  router.delete(
    "/:projectId/file-folders/:folderId",
    requireDb,
    auth,
    folderDelete,
    resolveProject,
    projectAccess,
    (req, res) => {
      void ctrl.deleteFileFolder(req, res);
    }
  );

  app.use("/api/projects", router);
}
