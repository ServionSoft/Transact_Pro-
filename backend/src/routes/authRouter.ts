import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createAuthController } from "../controllers/authController.js";
import { createAcceptInviteHandler } from "../controllers/teamMembersController.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePool } from "../middleware/storedProject.js";

export function registerAuthRoutes(app: Express, config: AppConfig, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    router.post("/auth/login", requirePool(null));
    router.post("/auth/accept-invite", requirePool(null));
    router.get("/auth/me", requirePool(null));
    router.post("/auth/refresh", requirePool(null));
    router.post("/auth/logout", requirePool(null));
    router.post("/auth/change-password", requirePool(null));
    app.use("/api", router);
    return;
  }
  const ctrl = createAuthController(pool, config);
  const acceptInvite = createAcceptInviteHandler(pool);
  router.post("/auth/login", requirePool(pool), (req, res) => {
    void ctrl.login(req, res);
  });
  router.post("/auth/accept-invite", requirePool(pool), (req, res) => {
    void acceptInvite(req, res);
  });
  router.get("/auth/me", requirePool(pool), requireAuth(config, pool), (req, res) => {
    void ctrl.me(req, res);
  });
  router.post("/auth/refresh", requirePool(pool), (req, res) => {
    void ctrl.refresh(req, res);
  });
  router.post("/auth/logout", requirePool(pool), (req, res) => {
    void ctrl.logout(req, res);
  });
  router.post("/auth/change-password", requirePool(pool), requireAuth(config, pool), (req, res) => {
    void ctrl.changePassword(req, res);
  });
  app.use("/api", router);
}
