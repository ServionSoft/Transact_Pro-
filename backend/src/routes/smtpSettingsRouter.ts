import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createSmtpSettingsController } from "../controllers/smtpSettingsController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { requirePool } from "../middleware/storedProject.js";

export function registerSmtpSettingsRoutes(app: Express, config: AppConfig, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    router.get("/smtp-settings", requirePool(null));
    app.use("/api", router);
    return;
  }
  const ctrl = createSmtpSettingsController(pool, config);
  const auth = requireAuth(config, pool);
  const manage = requirePermission(pool, "settings.manage_integrations");

  router.get("/smtp-settings", requirePool(pool), auth, manage, (req, res) => {
    void ctrl.get(req, res);
  });
  router.put("/smtp-settings", requirePool(pool), auth, manage, (req, res) => {
    void ctrl.put(req, res);
  });
  router.post("/smtp-settings/test", requirePool(pool), auth, manage, (req, res) => {
    void ctrl.test(req, res);
  });
  app.use("/api", router);
}
