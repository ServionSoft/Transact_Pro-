import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createEsignSettingsController } from "../controllers/esignSettingsController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { requirePool } from "../middleware/storedProject.js";

export function registerEsignSettingsRoutes(app: Express, config: AppConfig, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    router.get("/esign-settings", requirePool(null));
    app.use("/api", router);
    return;
  }

  const ctrl = createEsignSettingsController(pool);
  const auth = requireAuth(config, pool);
  const manage = requirePermission(pool, "settings.manage_integrations");

  router.get("/esign-settings", requirePool(pool), auth, manage, (req, res) => {
    void ctrl.get(req, res);
  });
  router.put("/esign-settings", requirePool(pool), auth, manage, (req, res) => {
    void ctrl.put(req, res);
  });

  app.use("/api", router);
}

