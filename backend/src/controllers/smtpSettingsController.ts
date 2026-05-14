import type { Request, Response } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { currentUser } from "../middleware/auth.js";
import { deriveSmtpPasswordKeyHex } from "../utils/smtpSecretCrypto.js";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { insertStoredFile, mapFileToApiPayload, absolutePathForStorageKey } from "../services/storedFilesService.js";
import { storageKeyFor } from "../utils/storedFilesLayout.js";
import {
  getSmtpSettings,
  testSmtpConnection,
  testSmtpSavedSettings,
  upsertSmtpSettings,
  type SmtpTestInput,
  type SmtpUpsertInput,
} from "../services/smtpSettingsService.js";

// Extend controller type to include uploadVendorSignature at runtime.

function parseBool(v: unknown, defaultVal: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return defaultVal;
}

function parseUpsert(body: unknown): SmtpUpsertInput | null {
  if (body == null || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.host !== "string") return null;
  const portRaw = b.port;
  const port = typeof portRaw === "number" && Number.isFinite(portRaw) ? portRaw : Number(portRaw);
  if (!Number.isFinite(port) || port < 1 || port > 65535) return null;
  return {
    host: b.host,
    port: Math.trunc(port),
    secure: parseBool(b.secure, false),
    authUser: typeof b.authUser === "string" ? b.authUser : "",
    password: typeof b.password === "string" ? b.password : undefined,
    fromEmail: typeof b.fromEmail === "string" ? b.fromEmail : "",
    fromName: typeof b.fromName === "string" ? b.fromName : "",
  };
}

function parseTest(body: unknown): { mode: "saved"; sendTestEmailTo?: string } | SmtpTestInput | null {
  if (body == null || typeof body !== "object") return { mode: "saved" };
  const b = body as Record<string, unknown>;
  const sendTestEmailTo = typeof b.sendTestEmailTo === "string" ? b.sendTestEmailTo : undefined;
  if (b.testSaved === true) return { mode: "saved", sendTestEmailTo };
  if (typeof b.host !== "string") return { mode: "saved", sendTestEmailTo };
  const portRaw = b.port;
  const port = typeof portRaw === "number" && Number.isFinite(portRaw) ? portRaw : Number(portRaw);
  if (!Number.isFinite(port) || port < 1 || port > 65535) return null;
  return {
    host: b.host,
    port: Math.trunc(port),
    secure: parseBool(b.secure, false),
    authUser: typeof b.authUser === "string" ? b.authUser : "",
    password: typeof b.password === "string" ? b.password : undefined,
    useStoredPassword: b.useStoredPassword === true,
    fromEmail: typeof b.fromEmail === "string" ? b.fromEmail : undefined,
    fromName: typeof b.fromName === "string" ? b.fromName : undefined,
    sendTestEmailTo,
  };
}

export function createSmtpSettingsController(pool: Pool, config: AppConfig) {
  return {
    async get(_req: Request, res: Response): Promise<void> {
      try {
        const settings = await getSmtpSettings(pool);
        res.json({ success: true, data: { settings }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "SMTP_SETTINGS_LOAD_FAILED", message: "Could not load SMTP settings." },
        });
      }
    },

    async put(req: Request, res: Response): Promise<void> {
      const parsed = parseUpsert(req.body);
      if (!parsed) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid body: host (string) and port (1–65535) are required." },
        });
        return;
      }
      const pwd = parsed.password?.trim() ?? "";
      if (pwd.length > 0 && !config.jwtAccessSecret?.trim()) {
        res.status(503).json({
          success: false,
          error: {
            code: "AUTH_NOT_CONFIGURED",
            message:
              "Set JWT_ACCESS_SECRET in backend/.env before saving an SMTP password (used to encrypt it in the database).",
          },
        });
        return;
      }
      try {
        const keyHex = pwd.length > 0 ? deriveSmtpPasswordKeyHex(config.jwtAccessSecret!) : "";
        const settings = await upsertSmtpSettings(pool, parsed, keyHex);
        res.json({ success: true, data: { settings }, message: "SMTP settings saved." });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not save SMTP settings.";
        res.status(400).json({
          success: false,
          error: { code: "SMTP_SETTINGS_SAVE_FAILED", message: msg },
        });
      }
    },

    async test(req: Request, res: Response): Promise<void> {
      const parsed = parseTest(req.body);
      if (parsed === null) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid test payload: port must be 1–65535 when host is sent." },
        });
        return;
      }
      const u = currentUser(req);
      const fromBody =
        req.body && typeof req.body === "object" && "sendTestEmailTo" in (req.body as object)
          ? String((req.body as Record<string, unknown>).sendTestEmailTo ?? "").trim()
          : "";
      const sendTestEmailTo = (fromBody || u?.email?.trim() || "").trim();
      if (!sendTestEmailTo) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "sendTestEmailTo is required (or sign in with an account that has an email address).",
          },
        });
        return;
      }
      try {
        if ("mode" in parsed && parsed.mode === "saved") {
          const result = await testSmtpSavedSettings(pool, config, sendTestEmailTo);
          res.json({ success: true, data: result, message: result.message });
          return;
        }
        const probe = { ...(parsed as SmtpTestInput), sendTestEmailTo };
        const result = await testSmtpConnection(pool, config, probe);
        res.json({ success: true, data: result, message: result.message });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "SMTP verification failed.";
        res.status(400).json({
          success: false,
          error: { code: "SMTP_TEST_FAILED", message: msg },
        });
      }
    },

    async uploadVendorSignature(req: Request, res: Response): Promise<void> {
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({ success: false, error: { code: "NO_FILE", message: 'Expected multipart field "file".' } });
        return;
      }
      const mime = (file.mimetype || "").toLowerCase();
      const name = (file.originalname || "").toLowerCase();
      const isPng = mime.includes("png") || name.endsWith(".png");
      if (!isPng) {
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch {
          /* ignore */
        }
        res.status(422).json({ success: false, error: { code: "PNG_REQUIRED", message: "Signature must be a PNG image." } });
        return;
      }

      const projectId = config.crmVaultProjectId;
      const diskName = `${randomUUID()}.png`;
      const storageKey = storageKeyFor(projectId, null, diskName);
      const finalAbs = absolutePathForStorageKey(path.resolve(config.uploadDir), storageKey);
      try {
        fs.mkdirSync(path.dirname(finalAbs), { recursive: true });
        fs.renameSync(file.path, finalAbs);
      } catch (e) {
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch {
          /* ignore */
        }
        res.status(500).json({ success: false, error: { code: "UPLOAD_MOVE_FAILED", message: "Could not place signature file on disk." } });
        return;
      }

      const stat = fs.statSync(finalAbs);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const stored = await insertStoredFile(client, {
          projectId,
          folderId: null,
          displayName: file.originalname.slice(0, 512) || "vendor-signature.png",
          storageKey,
          sizeBytes: stat.size,
          mimeType: "image/png",
          uploadedByUserId: Number(currentUser(req)?.id ?? config.defaultUploadUserId ?? null) || null,
        });
        await client.query(
          `UPDATE public.smtp_settings
           SET vendor_signature_file_id = $1::bigint, updated_at = now()
           WHERE id = 1`,
          [Number(stored.id)]
        );
        await client.query("COMMIT");
        res.status(201).json({ success: true, data: { file: mapFileToApiPayload(stored) }, message: "" });
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        try {
          if (fs.existsSync(finalAbs)) fs.unlinkSync(finalAbs);
        } catch {
          /* ignore */
        }
        res.status(500).json({
          success: false,
          error: { code: "SIGNATURE_SAVE_FAILED", message: err instanceof Error ? err.message : "Could not save signature." },
        });
      } finally {
        client.release();
      }
    },
  };
}
