import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import { createDocumentRulesController } from "../controllers/documentRulesController.js";
import { requirePool } from "../middleware/storedProject.js";

export function registerDocumentRulesRoutes(app: Express, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    router.get("/document-rules", requirePool(null));
    app.use("/api", router);
    return;
  }
  const ctrl = createDocumentRulesController(pool);
  router.get("/document-rules", requirePool(pool), (req, res) => {
    void ctrl.list(req, res);
  });
  router.post("/document-rules", requirePool(pool), (req, res) => {
    void ctrl.create(req, res);
  });
  router.get("/document-rules/:id", requirePool(pool), (req, res) => {
    void ctrl.getById(req, res);
  });
  router.put("/document-rules/:id", requirePool(pool), (req, res) => {
    void ctrl.update(req, res);
  });
  router.patch("/document-rules/:id", requirePool(pool), (req, res) => {
    void ctrl.patchActive(req, res);
  });
  router.delete("/document-rules/:id", requirePool(pool), (req, res) => {
    void ctrl.remove(req, res);
  });
  app.use("/api", router);
}
