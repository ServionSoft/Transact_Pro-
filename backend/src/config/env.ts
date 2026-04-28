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
  jwtAccessSecret: string | undefined;
  jwtRefreshSecret: string | undefined;
  accessTokenTtl: string;
  refreshTokenTtl: string;
  /** Base URL of the SPA (for invite links), e.g. http://localhost:8080 */
  publicAppUrl: string;
  /** Hours until invite token expires */
  inviteTtlHours: number;
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
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET?.trim() || undefined;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET?.trim() || undefined;
  const accessTokenTtl = process.env.ACCESS_TOKEN_TTL?.trim() || "15m";
  const refreshTokenTtl = process.env.REFRESH_TOKEN_TTL?.trim() || "7d";
  const publicAppUrl =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.FRONTEND_APP_URL?.trim() ||
    "http://localhost:8080";
  const inviteTtlHours = Math.max(1, Number(process.env.INVITE_TTL_HOURS) || 168);

  return {
    port,
    nodeEnv,
    corsOrigins,
    databaseUrl,
    crmVaultProjectId,
    crmVaultSlug,
    uploadDir,
    defaultUploadUserId,
    jwtAccessSecret,
    jwtRefreshSecret,
    accessTokenTtl,
    refreshTokenTtl,
    publicAppUrl,
    inviteTtlHours,
  };
}
