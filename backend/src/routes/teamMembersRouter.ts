import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createTeamMembersController } from "../controllers/teamMembersController.js";
import { requireAuth, requirePermission, requireAnyPermission } from "../middleware/auth.js";
import { requirePool } from "../middleware/storedProject.js";

const teamPermCatalog = [
  "team_members.edit",
  "team_members.create",
  "team_members.assign_permissions",
  "role_profiles.view",
];

export function registerTeamMembersRoutes(app: Express, config: AppConfig, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    router.get("/team-members", requirePool(null));
    app.use("/api", router);
    return;
  }
  const ctrl = createTeamMembersController(pool, config);
  const auth = requireAuth(config, pool);
  const view = requirePermission(pool, "team_members.view");
  const create = requirePermission(pool, "team_members.create");
  const invite = requirePermission(pool, "team_members.invite");
  const edit = requirePermission(pool, "team_members.edit");
  const del = requireAnyPermission(pool, ["team_members.deactivate", "team_members.delete"]);
  const catalog = requireAnyPermission(pool, teamPermCatalog);

  router.get("/team-members/role-defaults/:role", requirePool(pool), auth, catalog, (req, res) => {
    void ctrl.roleDefaults(req, res);
  });
  router.get("/team-members/permissions", requirePool(pool), auth, catalog, (req, res) => {
    void ctrl.listPermissions(req, res);
  });
  router.get("/team-members/meta/projects", requirePool(pool), auth, catalog, (req, res) => {
    void ctrl.listProjects(req, res);
  });
  router.get("/team-members", requirePool(pool), auth, view, (req, res) => {
    void ctrl.list(req, res);
  });
  router.get("/team-members/:id", requirePool(pool), auth, view, (req, res) => {
    void ctrl.getById(req, res);
  });
  router.post("/team-members", requirePool(pool), auth, create, (req, res) => {
    void ctrl.create(req, res);
  });
  router.post("/team-members/invite", requirePool(pool), auth, invite, (req, res) => {
    void ctrl.invite(req, res);
  });
  router.put("/team-members/:id", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.update(req, res);
  });
  router.patch("/team-members/:id/deactivate", requirePool(pool), auth, del, (req, res) => {
    void ctrl.deactivate(req, res);
  });
  app.use("/api", router);
}
