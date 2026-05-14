import type { Request, Response } from "express";
import type { Pool } from "pg";
import { getEsignSettings, upsertEsignSettings } from "../services/esignSettingsService.js";

function parseNullableInt(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseUpsert(body: unknown): { vendorName: string; vendorEmail: string; vendorSignatureFileId: number | null } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const vendorName = typeof b.vendorName === "string" ? b.vendorName : "";
  const vendorEmail = typeof b.vendorEmail === "string" ? b.vendorEmail : "";
  const vendorSignatureFileId = parseNullableInt(b.vendorSignatureFileId);
  return { vendorName, vendorEmail, vendorSignatureFileId };
}

export function createEsignSettingsController(pool: Pool) {
  return {
    async get(_req: Request, res: Response): Promise<void> {
      try {
        const settings = await getEsignSettings(pool);
        res.json({ success: true, data: { settings }, message: "" });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: { code: "ESIGN_SETTINGS_GET_FAILED", message: error instanceof Error ? error.message : "Could not load eSign settings." },
        });
      }
    },

    async put(req: Request, res: Response): Promise<void> {
      const parsed = parseUpsert(req.body);
      if (!parsed) {
        res.status(422).json({ success: false, error: { code: "INVALID_BODY", message: "Invalid request body." } });
        return;
      }
      try {
        const settings = await upsertEsignSettings(pool, parsed);
        res.json({ success: true, data: { settings }, message: "" });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: { code: "ESIGN_SETTINGS_SAVE_FAILED", message: error instanceof Error ? error.message : "Could not save eSign settings." },
        });
      }
    },
  };
}

