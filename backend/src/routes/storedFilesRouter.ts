import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createStoredFilesController, sendMulterError } from "../controllers/storedFilesController.js";
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
  const resolveProject = resolveProjectMiddleware(config, pool);

  router.get("/:projectId/stored-files", requireDb, resolveProject, (req, res) => {
    void ctrl.list(req, res);
  });

  router.post(
    "/:projectId/stored-files",
    requireDb,
    resolveProject,
    (req, res, next) => {
      upload(req, res, (err) => {
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

  router.patch("/:projectId/stored-files/:fileId", requireDb, resolveProject, (req, res) => {
    void ctrl.patchStoredFile(req, res);
  });

  router.delete("/:projectId/stored-files/:fileId", requireDb, resolveProject, (req, res) => {
    void ctrl.deleteStoredFile(req, res);
  });

  router.get("/:projectId/stored-files/:fileId/download", requireDb, resolveProject, (req, res) => {
    void ctrl.downloadStoredFile(req, res);
  });

  router.post("/:projectId/file-folders", requireDb, resolveProject, (req, res) => {
    void ctrl.createFileFolder(req, res);
  });

  router.delete(
    "/:projectId/file-folders/:folderId",
    requireDb,
    resolveProject,
    (req, res) => {
      void ctrl.deleteFileFolder(req, res);
    }
  );

  app.use("/api/projects", router);
}
