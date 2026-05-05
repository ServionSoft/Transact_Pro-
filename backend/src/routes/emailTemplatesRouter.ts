import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createEmailTemplatesController } from "../controllers/emailTemplatesController.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePool } from "../middleware/storedProject.js";

export function registerEmailTemplatesRoutes(app: Express, config: AppConfig, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    router.get("/email-templates", requirePool(null));
    app.use("/api", router);
    return;
  }
  const ctrl = createEmailTemplatesController(pool);
  const auth = requireAuth(config, pool);

  router.get("/email-templates", requirePool(pool), auth, (req, res) => {
    void ctrl.list(req, res);
  });
  router.post("/email-templates", requirePool(pool), auth, (req, res) => {
    void ctrl.create(req, res);
  });
  router.put("/email-templates/:id", requirePool(pool), auth, (req, res) => {
    void ctrl.update(req, res);
  });
  router.delete("/email-templates/:id", requirePool(pool), auth, (req, res) => {
    void ctrl.remove(req, res);
  });

  app.use("/api", router);
}

