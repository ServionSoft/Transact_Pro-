import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createEsignController } from "../controllers/esignController.js";
import { requireAuth, requirePermission, requireProjectAccess } from "../middleware/auth.js";
import { requirePool, resolveProjectMiddleware } from "../middleware/storedProject.js";
import path from "node:path";

export function registerEsignRoutes(app: Express, config: AppConfig, pool: Pool | null): void {
  const router = Router();
  const uploadDirAbs = path.resolve(config.uploadDir);
  if (!pool) {
    router.use(requirePool(null));
    app.use("/api/projects", router);
    return;
  }
  const ctrl = createEsignController(pool, { uploadDirAbs, config });
  const requireDb = requirePool(pool);
  const auth = requireAuth(config, pool);
  const resolveProject = resolveProjectMiddleware(config, pool);
  const projectAccess = requireProjectAccess(pool);
  const docView = requirePermission(pool, "documents.view");
  const docUpload = requirePermission(pool, "documents.upload");

  router.get("/:projectId/esign-documents", requireDb, auth, docView, resolveProject, projectAccess, (req, res) => {
    void ctrl.list(req, res);
  });
  router.post("/:projectId/esign-documents", requireDb, auth, docUpload, resolveProject, projectAccess, (req, res) => {
    void ctrl.create(req, res);
  });
  router.get("/:projectId/esign-documents/:documentId", requireDb, auth, docView, resolveProject, projectAccess, (req, res) => {
    void ctrl.get(req, res);
  });
  router.put("/:projectId/esign-documents/:documentId", requireDb, auth, docUpload, resolveProject, projectAccess, (req, res) => {
    void ctrl.save(req, res);
  });
  router.patch("/:projectId/esign-documents/:documentId", requireDb, auth, docUpload, resolveProject, projectAccess, (req, res) => {
    void ctrl.patchTitle(req, res);
  });
  router.post(
    "/:projectId/esign-documents/:documentId/ready",
    requireDb,
    auth,
    docUpload,
    resolveProject,
    projectAccess,
    (req, res) => {
      void ctrl.markReady(req, res);
    }
  );
  router.post(
    "/:projectId/esign-documents/:documentId/send-docusign",
    requireDb,
    auth,
    docUpload,
    resolveProject,
    projectAccess,
    (req, res) => {
      void ctrl.sendDocusign(req, res);
    }
  );
  router.post(
    "/:projectId/esign-documents/:documentId/sync-docusign-completion",
    requireDb,
    auth,
    docUpload,
    resolveProject,
    projectAccess,
    (req, res) => {
      void ctrl.syncDocusignCompletion(req, res);
    }
  );
  router.delete("/:projectId/esign-documents/:documentId", requireDb, auth, docUpload, resolveProject, projectAccess, (req, res) => {
    void ctrl.delete(req, res);
  });
  router.delete(
    "/:projectId/esign-documents/by-file/:fileId",
    requireDb,
    auth,
    docUpload,
    resolveProject,
    projectAccess,
    (req, res) => {
      void ctrl.deleteByFile(req, res);
    }
  );

  app.use("/api/projects", router);
}
