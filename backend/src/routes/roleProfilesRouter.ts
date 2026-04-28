import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createRoleProfilesController } from "../controllers/roleProfilesController.js";
import { requireAuth, requireAnyPermission, requirePermission } from "../middleware/auth.js";
import { requirePool } from "../middleware/storedProject.js";

const listPerms = [
  "team_members.create",
  "team_members.invite",
  "team_members.edit",
  "role_profiles.view",
];

export function registerRoleProfilesRoutes(app: Express, config: AppConfig, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    app.use("/api", router);
    return;
  }
  const ctrl = createRoleProfilesController(pool);
  const auth = requireAuth(config, pool);
  const canList = requireAnyPermission(pool, listPerms);
  const create = requirePermission(pool, "role_profiles.create");
  const edit = requirePermission(pool, "role_profiles.edit");
  const del = requirePermission(pool, "role_profiles.delete");

  router.get("/role-profiles", requirePool(pool), auth, canList, (req, res) => {
    void ctrl.list(req, res);
  });
  router.get("/role-profiles/:id", requirePool(pool), auth, canList, (req, res) => {
    void ctrl.getById(req, res);
  });
  router.post("/role-profiles", requirePool(pool), auth, create, (req, res) => {
    void ctrl.create(req, res);
  });
  router.put("/role-profiles/:id", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.update(req, res);
  });
  router.delete("/role-profiles/:id", requirePool(pool), auth, del, (req, res) => {
    void ctrl.remove(req, res);
  });
  app.use("/api", router);
}
