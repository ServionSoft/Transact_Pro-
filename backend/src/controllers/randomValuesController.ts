import type { Request, Response } from "express";
import type { Pool } from "pg";
import { insertRandomValue, listRandomValues } from "../services/randomValuesService.js";

export function createRandomValuesController(pool: Pool) {
  return {
    async create(_req: Request, res: Response): Promise<void> {
      try {
        const row = await insertRandomValue(pool);
        res.status(201).json({
          success: true,
          data: { randomValue: row },
          message: "",
        });
      } catch {
        res.status(500).json({
          success: false,
          error: {
            code: "RANDOM_VALUE_INSERT_FAILED",
            message: "Could not insert random value.",
          },
        });
      }
    },

    async list(_req: Request, res: Response): Promise<void> {
      try {
        const items = await listRandomValues(pool);
        res.json({
          success: true,
          data: { randomValues: items },
          message: "",
        });
      } catch {
        res.status(500).json({
          success: false,
          error: {
            code: "RANDOM_VALUE_LIST_FAILED",
            message: "Could not list random values.",
          },
        });
      }
    },
  };
}
