import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import { createRandomValuesController } from "../controllers/randomValuesController.js";
import { requirePool } from "../middleware/storedProject.js";

export function registerRandomValuesRoutes(app: Express, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    router.post("/random-values", requirePool(null));
    router.get("/random-values", requirePool(null));
    app.use("/api", router);
    return;
  }

  const ctrl = createRandomValuesController(pool);

  router.post("/random-values", requirePool(pool), (req, res) => {
    void ctrl.create(req, res);
  });
  router.get("/random-values", requirePool(pool), (req, res) => {
    void ctrl.list(req, res);
  });

  app.use("/api", router);
}
