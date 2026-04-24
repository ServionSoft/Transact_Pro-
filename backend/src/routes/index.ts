import type { Express, Request, Response } from "express";
import type { AppConfig } from "../config/env.js";
import { getPool } from "../db/pool.js";
import { registerDocumentRulesRoutes } from "./documentRulesRouter.js";
import { registerStoredFilesRoutes } from "./storedFilesRouter.js";

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
  registerDocumentRulesRoutes(app, pool);
  registerStoredFilesRoutes(app, config, pool);
}
