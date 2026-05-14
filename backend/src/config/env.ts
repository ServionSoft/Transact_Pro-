import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Backend package root (`backend/`), whether running from `src/` or `dist/`. */
const backendPackageRoot = path.resolve(__dirname, "..", "..");

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
  /** DocuSign JWT / Connect (optional until configured) */
  docusignIntegrationKey: string | undefined;
  docusignUserId: string | undefined;
  docusignAccountId: string | undefined;
  docusignRsaPrivateKey: string | undefined;
  docusignRsaPrivateKeyPath: string | undefined;
  /** REST API base, e.g. https://www.docusign.net/restapi (production) */
  docusignBasePath: string;
  /** OAuth hostname, e.g. account.docusign.com (production) */
  docusignOAuthHost: string;
  /** Redirect URI for JWT consent URL; must match a URI on the Integration Key (default https://www.docusign.com). */
  docusignConsentRedirectUri: string;
  /** HMAC key for Connect signature verification (optional in development) */
  docusignConnectHmacKey: string | undefined;
  /** When true, logs envelope recipient summary before create and calls listRecipients after (server logs only). */
  docusignDebugEnvelope: boolean;
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

  const docusignIntegrationKey = process.env.DOCUSIGN_INTEGRATION_KEY?.trim() || undefined;
  const docusignUserId = process.env.DOCUSIGN_USER_ID?.trim() || undefined;
  const docusignAccountId = process.env.DOCUSIGN_ACCOUNT_ID?.trim() || undefined;
  const docusignRsaPrivateKey = process.env.DOCUSIGN_RSA_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() || undefined;
  const docusignRsaPrivateKeyPathRaw = process.env.DOCUSIGN_RSA_PRIVATE_KEY_PATH?.trim() || undefined;
  const docusignRsaPrivateKeyPath =
    docusignRsaPrivateKeyPathRaw && !path.isAbsolute(docusignRsaPrivateKeyPathRaw)
      ? path.resolve(backendPackageRoot, docusignRsaPrivateKeyPathRaw)
      : docusignRsaPrivateKeyPathRaw;
  const docusignBasePath =
    process.env.DOCUSIGN_BASE_PATH?.trim() || "https://www.docusign.net/restapi";
  const docusignOAuthHost = process.env.DOCUSIGN_OAUTH_HOST?.trim() || "account.docusign.com";
  const docusignConsentRedirectUri =
    process.env.DOCUSIGN_CONSENT_REDIRECT_URI?.trim() || "https://www.docusign.com";
  const docusignConnectHmacKey = process.env.DOCUSIGN_CONNECT_HMAC_KEY?.trim() || undefined;
  const docusignDebugEnvelope = process.env.DOCUSIGN_DEBUG_ENVELOPE === "true" || process.env.DOCUSIGN_DEBUG_ENVELOPE === "1";

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
    docusignIntegrationKey,
    docusignUserId,
    docusignAccountId,
    docusignRsaPrivateKey,
    docusignRsaPrivateKeyPath,
    docusignBasePath,
    docusignOAuthHost,
    docusignConsentRedirectUri,
    docusignConnectHmacKey,
    docusignDebugEnvelope,
  };
}
