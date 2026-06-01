import type { Request, Response } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import {
  getDocusignSettings,
  getConsentUrlForRuntime,
  resolveDocusignRuntimeConfig,
  testDocusignConnection,
  upsertDocusignSettings,
  type DocusignSettingsUpsertInput,
} from "../services/docusignSettingsService.js";

function parseEnvironment(v: unknown): "demo" | "production" | null {
  if (v === "demo" || v === "production") return v;
  return null;
}

function parseUpsert(body: unknown): DocusignSettingsUpsertInput | null {
  if (body == null || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const environment = parseEnvironment(b.environment);
  if (!environment) return null;
  if (typeof b.integrationKey !== "string" || typeof b.userId !== "string" || typeof b.accountId !== "string") {
    return null;
  }
  return {
    environment,
    integrationKey: b.integrationKey,
    userId: b.userId,
    accountId: b.accountId,
    consentRedirectUri: typeof b.consentRedirectUri === "string" ? b.consentRedirectUri : undefined,
    privateKey: typeof b.privateKey === "string" ? b.privateKey : undefined,
    connectHmacKey: typeof b.connectHmacKey === "string" ? b.connectHmacKey : undefined,
  };
}

function parseTest(body: unknown): Partial<DocusignSettingsUpsertInput> & { useStoredPrivateKey?: boolean } | null {
  if (body == null || typeof body !== "object") return {};
  const b = body as Record<string, unknown>;
  if (b.testSaved === true) return { useStoredPrivateKey: true };
  const environment = parseEnvironment(b.environment);
  if (!environment && typeof b.integrationKey !== "string") return {};
  return {
    environment: environment ?? undefined,
    integrationKey: typeof b.integrationKey === "string" ? b.integrationKey : undefined,
    userId: typeof b.userId === "string" ? b.userId : undefined,
    accountId: typeof b.accountId === "string" ? b.accountId : undefined,
    consentRedirectUri: typeof b.consentRedirectUri === "string" ? b.consentRedirectUri : undefined,
    privateKey: typeof b.privateKey === "string" ? b.privateKey : undefined,
    useStoredPrivateKey: b.useStoredPrivateKey === true,
  };
}

export function createDocusignSettingsController(pool: Pool, config: AppConfig) {
  return {
    async get(_req: Request, res: Response): Promise<void> {
      try {
        const settings = await getDocusignSettings(pool, config);
        res.json({ success: true, data: { settings }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "DOCUSIGN_SETTINGS_LOAD_FAILED", message: "Could not load DocuSign settings." },
        });
      }
    },

    async put(req: Request, res: Response): Promise<void> {
      const parsed = parseUpsert(req.body);
      if (!parsed) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid body: environment (demo|production), integrationKey, userId, and accountId are required.",
          },
        });
        return;
      }
      const keyTrim = parsed.privateKey?.trim() ?? "";
      if (keyTrim.length > 0 && !config.jwtAccessSecret?.trim()) {
        res.status(503).json({
          success: false,
          error: {
            code: "AUTH_NOT_CONFIGURED",
            message:
              "Set JWT_ACCESS_SECRET in backend/.env before saving an encrypted private key (same key as SMTP password encryption).",
          },
        });
        return;
      }
      try {
        const settings = await upsertDocusignSettings(pool, parsed, config);
        res.json({ success: true, data: { settings }, message: "DocuSign settings saved." });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not save DocuSign settings.";
        res.status(400).json({
          success: false,
          error: { code: "DOCUSIGN_SETTINGS_SAVE_FAILED", message: msg },
        });
      }
    },

    async test(req: Request, res: Response): Promise<void> {
      const parsed = parseTest(req.body);
      if (parsed === null) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid test payload." },
        });
        return;
      }
      try {
        const result = await testDocusignConnection(pool, config, parsed);
        res.json({ success: true, data: result, message: result.message });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "DocuSign JWT test failed.";
        res.status(400).json({
          success: false,
          error: { code: "DOCUSIGN_TEST_FAILED", message: msg },
        });
      }
    },

    async consent(_req: Request, res: Response): Promise<void> {
      try {
        const runtime = await resolveDocusignRuntimeConfig(pool, config);
        const consentUrl = getConsentUrlForRuntime(runtime);
        res.json({ success: true, data: { consentUrl }, message: "" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "DocuSign is not configured.";
        res.status(400).json({
          success: false,
          error: { code: "DOCUSIGN_NOT_CONFIGURED", message: msg },
        });
      }
    },
  };
}
