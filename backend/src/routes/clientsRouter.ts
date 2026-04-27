import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createClientsController } from "../controllers/clientsController.js";
import { requirePool } from "../middleware/storedProject.js";

export function registerClientsRoutes(app: Express, config: AppConfig, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    router.get("/clients", requirePool(null));
    app.use("/api", router);
    return;
  }

  const ctrl = createClientsController(pool, config);
  router.get("/clients", requirePool(pool), (req, res) => {
    void ctrl.list(req, res);
  });
  router.post("/clients", requirePool(pool), (req, res) => {
    void ctrl.create(req, res);
  });
  router.get("/clients/:id", requirePool(pool), (req, res) => {
    void ctrl.getById(req, res);
  });
  router.put("/clients/:id", requirePool(pool), (req, res) => {
    void ctrl.update(req, res);
  });
  router.patch("/clients/:id/archive", requirePool(pool), (req, res) => {
    void ctrl.archive(req, res);
  });
  router.delete("/clients/:id/permanent", requirePool(pool), (req, res) => {
    void ctrl.permanentDelete(req, res);
  });
  app.use("/api", router);
}
