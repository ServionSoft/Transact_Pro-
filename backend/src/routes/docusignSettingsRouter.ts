import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createDocusignSettingsController } from "../controllers/docusignSettingsController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { requirePool } from "../middleware/storedProject.js";

export function registerDocusignSettingsRoutes(app: Express, config: AppConfig, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    router.get("/docusign-settings", requirePool(null));
    app.use("/api", router);
    return;
  }
  const ctrl = createDocusignSettingsController(pool, config);
  const auth = requireAuth(config, pool);
  const manage = requirePermission(pool, "settings.manage_integrations");

  router.get("/docusign-settings", requirePool(pool), auth, manage, (req, res) => {
    void ctrl.get(req, res);
  });
  router.put("/docusign-settings", requirePool(pool), auth, manage, (req, res) => {
    void ctrl.put(req, res);
  });
  router.post("/docusign-settings/test", requirePool(pool), auth, manage, (req, res) => {
    void ctrl.test(req, res);
  });
  router.get("/docusign-settings/consent-url", requirePool(pool), auth, manage, (req, res) => {
    void ctrl.consent(req, res);
  });
  app.use("/api", router);
}
