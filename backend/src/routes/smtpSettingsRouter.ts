import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createSmtpSettingsController } from "../controllers/smtpSettingsController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { requirePool } from "../middleware/storedProject.js";
import path from "node:path";
import fs from "node:fs";
import { createSmtpSignatureMulter } from "../middleware/smtpSignatureUpload.js";

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
  const uploadDirAbs = path.resolve(config.uploadDir);
  fs.mkdirSync(uploadDirAbs, { recursive: true });
  const upload = createSmtpSignatureMulter(uploadDirAbs, config).single("file");

  router.get("/smtp-settings", requirePool(pool), auth, manage, (req, res) => {
    void ctrl.get(req, res);
  });
  router.put("/smtp-settings", requirePool(pool), auth, manage, (req, res) => {
    void ctrl.put(req, res);
  });
  router.post("/smtp-settings/test", requirePool(pool), auth, manage, (req, res) => {
    void ctrl.test(req, res);
  });
  router.post("/smtp-settings/vendor-signature", requirePool(pool), auth, manage, (req, res, next) => {
    upload(req as any, res as any, (err) => {
      if (err) {
        res.status(400).json({ success: false, error: { code: "UPLOAD_FAILED", message: err instanceof Error ? err.message : String(err) } });
        return;
      }
      next();
    });
  }, (req, res) => {
    void ctrl.uploadVendorSignature(req, res);
  });
  app.use("/api", router);
}
