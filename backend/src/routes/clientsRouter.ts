import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createClientsController } from "../controllers/clientsController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { requirePool } from "../middleware/storedProject.js";

export function registerClientsRoutes(app: Express, config: AppConfig, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    router.get("/clients", requirePool(null));
    app.use("/api", router);
    return;
  }

  const ctrl = createClientsController(pool, config);
  const auth = requireAuth(config, pool);
  const view = requirePermission(pool, "clients.view");
  const create = requirePermission(pool, "clients.create");
  const edit = requirePermission(pool, "clients.edit");
  const archive = requirePermission(pool, "clients.archive");
  const restore = requirePermission(pool, "clients.restore");
  const deletePermanent = requirePermission(pool, "clients.delete_permanent");

  router.get("/clients", requirePool(pool), auth, view, (req, res) => {
    void ctrl.list(req, res);
  });
  router.post("/clients", requirePool(pool), auth, create, (req, res) => {
    void ctrl.create(req, res);
  });
  router.get("/clients/:id", requirePool(pool), auth, view, (req, res) => {
    void ctrl.getById(req, res);
  });
  router.put("/clients/:id", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.update(req, res);
  });
  router.patch("/clients/:id/archive", requirePool(pool), auth, archive, (req, res) => {
    void ctrl.archive(req, res);
  });
  router.patch("/clients/:id/unarchive", requirePool(pool), auth, restore, (req, res) => {
    void ctrl.unarchive(req, res);
  });
  router.delete("/clients/:id/permanent", requirePool(pool), auth, deletePermanent, (req, res) => {
    void ctrl.permanentDelete(req, res);
  });
  app.use("/api", router);
}
