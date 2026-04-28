import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import { createDocumentRulesController } from "../controllers/documentRulesController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { requirePool } from "../middleware/storedProject.js";
import type { AppConfig } from "../config/env.js";

export function registerDocumentRulesRoutes(app: Express, config: AppConfig, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    router.get("/document-rules", requirePool(null));
    app.use("/api", router);
    return;
  }
  const ctrl = createDocumentRulesController(pool);
  const auth = requireAuth(config, pool);
  const view = requirePermission(pool, "document_rules.view");
  const create = requirePermission(pool, "document_rules.create");
  const edit = requirePermission(pool, "document_rules.edit");
  const toggle = requirePermission(pool, "document_rules.toggle_active");
  const del = requirePermission(pool, "document_rules.delete");

  router.get("/document-rules", requirePool(pool), auth, view, (req, res) => {
    void ctrl.list(req, res);
  });
  router.post("/document-rules", requirePool(pool), auth, create, (req, res) => {
    void ctrl.create(req, res);
  });
  router.get("/document-rules/:id", requirePool(pool), auth, view, (req, res) => {
    void ctrl.getById(req, res);
  });
  router.put("/document-rules/:id", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.update(req, res);
  });
  router.patch("/document-rules/:id", requirePool(pool), auth, toggle, (req, res) => {
    void ctrl.patchActive(req, res);
  });
  router.delete("/document-rules/:id", requirePool(pool), auth, del, (req, res) => {
    void ctrl.remove(req, res);
  });
  app.use("/api", router);
}
