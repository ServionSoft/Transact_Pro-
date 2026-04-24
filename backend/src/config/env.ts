import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type AppConfig = {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
  /** Postgres connection string; when missing, stored-file routes return 503 */
  databaseUrl: string | undefined;
  /** `projects.id` for the CRM document library (slug `crm-doc-vault` in the API) */
  crmVaultProjectId: number;
  /** Slug in URL that maps to the CRM vault project id */
  crmVaultSlug: string;
  /** Directory for uploaded binaries (relative to cwd or absolute) */
  uploadDir: string;
  /** Optional `users.id` for `uploaded_by_user_id` until auth is wired */
  defaultUploadUserId: number | undefined;
};

export function loadConfig(): AppConfig {
  const port = Number(process.env.PORT) || 4000;
  const nodeEnv = process.env.NODE_ENV || "development";
  const raw = process.env.CORS_ORIGINS || "";
  const corsOrigins = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;
  const crmVaultProjectId = Number(process.env.CRM_VAULT_PROJECT_ID) || 1;
  const crmVaultSlug = (process.env.CRM_VAULT_SLUG || "crm-doc-vault").trim();
  const uploadDir =
    process.env.UPLOAD_DIR?.trim() ||
    path.join(process.cwd(), "uploads");

  const defaultUploadRaw = process.env.DEFAULT_UPLOAD_USER_ID?.trim();
  const defaultUploadUserId =
    defaultUploadRaw && /^\d+$/.test(defaultUploadRaw)
      ? Number(defaultUploadRaw)
      : undefined;

  return {
    port,
    nodeEnv,
    corsOrigins,
    databaseUrl,
    crmVaultProjectId,
    crmVaultSlug,
    uploadDir,
    defaultUploadUserId,
  };
}
