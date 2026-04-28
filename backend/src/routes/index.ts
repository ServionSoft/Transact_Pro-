import type { Express, Request, Response } from "express";
import type { AppConfig } from "../config/env.js";
import { getPool } from "../db/pool.js";
import { registerAuthRoutes } from "./authRouter.js";
import { registerClientsRoutes } from "./clientsRouter.js";
import { registerDocumentRulesRoutes } from "./documentRulesRouter.js";
import { registerStoredFilesRoutes } from "./storedFilesRouter.js";
import { registerRoleProfilesRoutes } from "./roleProfilesRouter.js";
import { registerTeamMembersRoutes } from "./teamMembersRouter.js";

export function registerRoutes(app: Express, config: AppConfig): void {
  app.get("/health", async (_req: Request, res: Response) => {
    const pool = getPool(config.databaseUrl);
    let database: "up" | "down" | "not_configured" = "not_configured";
    if (pool) {
      try {
        await pool.query("SELECT 1");
        database = "up";
      } catch {
        database = "down";
      }
    }
    res.json({
      success: true,
      data: { status: "ok", database },
      message: "",
    });
  });

  const pool = getPool(config.databaseUrl);
  registerAuthRoutes(app, config, pool);
  registerClientsRoutes(app, config, pool);
  registerDocumentRulesRoutes(app, config, pool);
  registerStoredFilesRoutes(app, config, pool);
  registerTeamMembersRoutes(app, config, pool);
  registerRoleProfilesRoutes(app, config, pool);
}
