import type { Request, Response, NextFunction } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { resolveNumericProjectId } from "../utils/resolveProjectId.js";
import { projectExists } from "../services/storedFilesService.js";
import { sendDatabaseUnavailable, sendUnknownProject } from "../utils/httpResponses.js";

export function requirePool(pool: Pool | null) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    if (!pool) {
      sendDatabaseUnavailable(res);
      return;
    }
    next();
  };
}

export function resolveProjectMiddleware(config: AppConfig, pool: Pool | null) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const numeric = resolveNumericProjectId(req.params.projectId ?? "", config);
    if (numeric === null) {
      sendUnknownProject(res);
      return;
    }
    if (!pool) {
      sendDatabaseUnavailable(res);
      return;
    }
    const ok = await projectExists(pool, numeric);
    if (!ok) {
      sendUnknownProject(res);
      return;
    }
    res.locals.numericProjectId = numeric;
    next();
  };
}
