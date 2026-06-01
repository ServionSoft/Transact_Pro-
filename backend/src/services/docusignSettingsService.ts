import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { encryptSmtpPassword, decryptSmtpPassword, deriveSmtpPasswordKeyHex } from "../utils/smtpSecretCrypto.js";
import {
  clearDocusignTokenCache,
  buildDocuSignJwtConsentUrl,
  getDocusignAccessToken,
} from "./docusign/docusignAuth.js";
import {
  type DocusignRuntimeConfig,
  hostsForEnvironment,
} from "./docusign/docusignRuntimeConfig.js";

export type DocusignSettingsPublic = {
  id: string;
  environment: "demo" | "production";
  integrationKey: string;
  userId: string;
  accountId: string;
  basePath: string;
  oauthHost: string;
  consentRedirectUri: string;
  hasPrivateKey: boolean;
  hasConnectHmacKey: boolean;
  configured: boolean;
  source: "database" | "environment" | "none";
};

export type DocusignSettingsUpsertInput = {
  environment: "demo" | "production";
  integrationKey: string;
  userId: string;
  accountId: string;
  consentRedirectUri?: string;
  privateKey?: string | null;
  connectHmacKey?: string | null;
};

function encryptionKeyHex(appConfig: AppConfig): string | null {
  const secret = appConfig.jwtAccessSecret?.trim();
  if (!secret) return null;
  return deriveSmtpPasswordKeyHex(secret);
}

function rowHasCredentials(row: {
  integration_key: string;
  user_id: string;
  account_id: string;
  has_private_key: boolean;
}): boolean {
  return (
    Boolean(row.integration_key?.trim()) &&
    Boolean(row.user_id?.trim()) &&
    Boolean(row.account_id?.trim()) &&
    Boolean(row.has_private_key)
  );
}

function runtimeFromEnv(appConfig: AppConfig): DocusignRuntimeConfig | null {
  const integrationKey = appConfig.docusignIntegrationKey?.trim() ?? "";
  const userId = appConfig.docusignUserId?.trim() ?? "";
  const accountId = appConfig.docusignAccountId?.trim() ?? "";
  if (!integrationKey || !userId || !accountId) return null;
  const hasKey =
    Boolean(appConfig.docusignRsaPrivateKey?.trim()) || Boolean(appConfig.docusignRsaPrivateKeyPath?.trim());
  if (!hasKey) return null;
  const basePath = appConfig.docusignBasePath?.trim() || "";
  const oauthHost = appConfig.docusignOAuthHost?.trim() || "";
  const environment: "demo" | "production" =
    basePath.includes("demo.docusign") || oauthHost.includes("account-d") ? "demo" : "production";
  return {
    integrationKey,
    userId,
    accountId,
    basePath: basePath || hostsForEnvironment(environment).basePath,
    oauthHost: oauthHost || hostsForEnvironment(environment).oauthHost,
    consentRedirectUri: appConfig.docusignConsentRedirectUri?.trim() || "https://www.docusign.com",
    connectHmacKey: appConfig.docusignConnectHmacKey?.trim() || undefined,
    environment,
    source: "environment",
  };
}

async function loadEncryptedSecrets(pool: Pool): Promise<{
  private_key_encrypted: string | null;
  connect_hmac_key_encrypted: string | null;
}> {
  const { rows } = await pool.query<{
    private_key_encrypted: string | null;
    connect_hmac_key_encrypted: string | null;
  }>(
    `SELECT private_key_encrypted, connect_hmac_key_encrypted
     FROM public.docusign_settings WHERE id = 1 LIMIT 1`
  );
  return rows[0] ?? { private_key_encrypted: null, connect_hmac_key_encrypted: null };
}

async function decryptField(
  ciphertext: string | null | undefined,
  keyHex: string | null
): Promise<string | null> {
  const enc = ciphertext?.trim();
  if (!enc) return null;
  if (keyHex) {
    try {
      return decryptSmtpPassword(enc, keyHex);
    } catch {
      return null;
    }
  }
  return enc;
}

export async function loadStoredPrivateKeyPem(pool: Pool, appConfig: AppConfig): Promise<string | null> {
  const { private_key_encrypted } = await loadEncryptedSecrets(pool);
  const fromDb = await decryptField(private_key_encrypted, encryptionKeyHex(appConfig));
  if (fromDb) return fromDb;

  const runtime = runtimeFromEnv(appConfig);
  if (!runtime) return null;
  if (appConfig.docusignRsaPrivateKey?.trim()) {
    return appConfig.docusignRsaPrivateKey.trim();
  }
  if (appConfig.docusignRsaPrivateKeyPath?.trim()) {
    const fs = await import("node:fs");
    try {
      return fs.readFileSync(appConfig.docusignRsaPrivateKeyPath, "utf8");
    } catch {
      return null;
    }
  }
  return null;
}

export async function loadStoredConnectHmacKey(pool: Pool, appConfig: AppConfig): Promise<string | undefined> {
  const { connect_hmac_key_encrypted } = await loadEncryptedSecrets(pool);
  const fromDb = await decryptField(connect_hmac_key_encrypted, encryptionKeyHex(appConfig));
  if (fromDb) return fromDb;
  return appConfig.docusignConnectHmacKey?.trim() || undefined;
}

function runtimeFromDbRow(row: {
  environment: string;
  integration_key: string;
  user_id: string;
  account_id: string;
  base_path: string;
  oauth_host: string;
  consent_redirect_uri: string;
  connect_hmac_key_encrypted: string | null;
  has_private_key: boolean;
}, connectHmac: string | undefined): DocusignRuntimeConfig | null {
  if (!rowHasCredentials({ ...row, has_private_key: row.has_private_key })) return null;
  const environment: "demo" | "production" = row.environment === "production" ? "production" : "demo";
  return {
    integrationKey: row.integration_key.trim(),
    userId: row.user_id.trim(),
    accountId: row.account_id.trim(),
    basePath: row.base_path.trim() || hostsForEnvironment(environment).basePath,
    oauthHost: row.oauth_host.trim() || hostsForEnvironment(environment).oauthHost,
    consentRedirectUri: row.consent_redirect_uri.trim() || "https://www.docusign.com",
    connectHmacKey: connectHmac,
    environment,
    source: "database",
  };
}

export async function resolveDocusignRuntimeConfig(
  pool: Pool,
  appConfig: AppConfig
): Promise<DocusignRuntimeConfig> {
  const { rows } = await pool.query<{
    environment: string;
    integration_key: string;
    user_id: string;
    account_id: string;
    base_path: string;
    oauth_host: string;
    consent_redirect_uri: string;
    has_private_key: boolean;
    connect_hmac_key_encrypted: string | null;
  }>(
    `SELECT environment, integration_key, user_id, account_id, base_path, oauth_host, consent_redirect_uri,
            connect_hmac_key_encrypted,
            (
              private_key_encrypted IS NOT NULL AND length(btrim(private_key_encrypted)) > 0
            ) AS has_private_key
     FROM public.docusign_settings WHERE id = 1 LIMIT 1`
  );
  const row = rows[0];
  if (row) {
    const connectHmac = await decryptField(row.connect_hmac_key_encrypted, encryptionKeyHex(appConfig));
    const fromDb = runtimeFromDbRow(row, connectHmac ?? undefined);
    if (fromDb) return fromDb;
  }

  const fromEnv = runtimeFromEnv(appConfig);
  if (fromEnv) return fromEnv;

  throw new Error(
    "DocuSign is not configured. Save credentials under Settings → DocuSign, or set DOCUSIGN_* environment variables."
  );
}

export async function getDocusignSettings(pool: Pool, appConfig: AppConfig): Promise<DocusignSettingsPublic> {
  const { rows } = await pool.query<{
    id: string;
    environment: string;
    integration_key: string;
    user_id: string;
    account_id: string;
    base_path: string;
    oauth_host: string;
    consent_redirect_uri: string;
    has_private_key: boolean;
    has_connect_hmac: boolean;
  }>(
    `SELECT id::text, environment, integration_key, user_id, account_id, base_path, oauth_host, consent_redirect_uri,
            (
              private_key_encrypted IS NOT NULL AND length(btrim(private_key_encrypted)) > 0
            ) AS has_private_key,
            (
              connect_hmac_key_encrypted IS NOT NULL AND length(btrim(connect_hmac_key_encrypted)) > 0
            ) AS has_connect_hmac
     FROM public.docusign_settings WHERE id = 1 LIMIT 1`
  );
  const row = rows[0];
  const envRuntime = runtimeFromEnv(appConfig);

  if (!row) {
    return {
      id: "1",
      environment: envRuntime?.environment ?? "demo",
      integrationKey: envRuntime?.integrationKey ?? "",
      userId: envRuntime?.userId ?? "",
      accountId: envRuntime?.accountId ?? "",
      basePath: envRuntime?.basePath ?? hostsForEnvironment("demo").basePath,
      oauthHost: envRuntime?.oauthHost ?? hostsForEnvironment("demo").oauthHost,
      consentRedirectUri: envRuntime?.consentRedirectUri ?? "https://www.docusign.com",
      hasPrivateKey: Boolean(envRuntime),
      hasConnectHmacKey: Boolean(envRuntime?.connectHmacKey),
      configured: Boolean(envRuntime),
      source: envRuntime ? "environment" : "none",
    };
  }

  let source: DocusignSettingsPublic["source"] = "none";
  let configured = false;
  if (rowHasCredentials(row)) {
    source = "database";
    configured = true;
  } else if (envRuntime) {
    source = "environment";
    configured = true;
  }

  const environment: "demo" | "production" = row.environment === "production" ? "production" : "demo";
  const hosts = hostsForEnvironment(environment);

  return {
    id: row.id,
    environment,
    integrationKey: row.integration_key?.trim() || envRuntime?.integrationKey || "",
    userId: row.user_id?.trim() || envRuntime?.userId || "",
    accountId: row.account_id?.trim() || envRuntime?.accountId || "",
    basePath: row.base_path?.trim() || envRuntime?.basePath || hosts.basePath,
    oauthHost: row.oauth_host?.trim() || envRuntime?.oauthHost || hosts.oauthHost,
    consentRedirectUri: row.consent_redirect_uri?.trim() || envRuntime?.consentRedirectUri || "https://www.docusign.com",
    hasPrivateKey: Boolean(row.has_private_key) || Boolean(envRuntime),
    hasConnectHmacKey: Boolean(row.has_connect_hmac) || Boolean(envRuntime?.connectHmacKey),
    configured,
    source,
  };
}

export async function upsertDocusignSettings(
  pool: Pool,
  input: DocusignSettingsUpsertInput,
  appConfig: AppConfig
): Promise<DocusignSettingsPublic> {
  const integrationKey = input.integrationKey.trim();
  const userId = input.userId.trim();
  const accountId = input.accountId.trim();
  if (!integrationKey || !userId || !accountId) {
    throw new Error("Integration Key, User ID, and Account ID are required.");
  }

  const privateKeyTrim = input.privateKey?.trim() ?? "";
  const connectTrim = input.connectHmacKey?.trim() ?? "";
  const keyHex = encryptionKeyHex(appConfig);

  if ((privateKeyTrim.length > 0 || connectTrim.length > 0) && !keyHex) {
    throw new Error("Set JWT_ACCESS_SECRET before saving encrypted DocuSign secrets.");
  }

  const environment: "demo" | "production" = input.environment === "production" ? "production" : "demo";
  const hosts = hostsForEnvironment(environment);
  const consentRedirectUri = (input.consentRedirectUri?.trim() || "https://www.docusign.com").slice(0, 512);

  const existing = await loadEncryptedSecrets(pool);
  let privateEnc = existing.private_key_encrypted;
  let connectEnc = existing.connect_hmac_key_encrypted;

  if (privateKeyTrim.length > 0) {
    privateEnc = encryptSmtpPassword(privateKeyTrim, keyHex!);
  } else if (!privateEnc?.trim()) {
    const envPem = await loadStoredPrivateKeyPem(pool, appConfig);
    if (!envPem?.trim()) {
      throw new Error("RSA private key is required on first save.");
    }
  }

  if (connectTrim.length > 0) {
    connectEnc = encryptSmtpPassword(connectTrim, keyHex!);
  }

  await pool.query(
    `UPDATE public.docusign_settings SET
       environment = $1,
       integration_key = $2,
       user_id = $3,
       account_id = $4,
       base_path = $5,
       oauth_host = $6,
       consent_redirect_uri = $7,
       private_key_encrypted = $8,
       connect_hmac_key_encrypted = $9,
       updated_at = now()
     WHERE id = 1`,
    [
      environment,
      integrationKey,
      userId,
      accountId,
      hosts.basePath,
      hosts.oauthHost,
      consentRedirectUri,
      privateEnc,
      connectEnc,
    ]
  );

  clearDocusignTokenCache();

  return getDocusignSettings(pool, appConfig);
}

export async function testDocusignConnection(
  pool: Pool,
  appConfig: AppConfig,
  input?: Partial<DocusignSettingsUpsertInput> & { useStoredPrivateKey?: boolean }
): Promise<{ message: string; consentUrl: string }> {
  let runtime: DocusignRuntimeConfig;
  let privateKey: string;

  if (input?.integrationKey?.trim() && input?.userId?.trim() && input?.accountId?.trim()) {
    const environment: "demo" | "production" = input.environment === "production" ? "production" : "demo";
    const hosts = hostsForEnvironment(environment);
    runtime = {
      integrationKey: input.integrationKey.trim(),
      userId: input.userId.trim(),
      accountId: input.accountId.trim(),
      basePath: hosts.basePath,
      oauthHost: hosts.oauthHost,
      consentRedirectUri: input.consentRedirectUri?.trim() || "https://www.docusign.com",
      connectHmacKey: undefined,
      environment,
      source: "database",
    };
    if (input.privateKey?.trim()) {
      privateKey = input.privateKey.trim();
    } else if (input.useStoredPrivateKey) {
      const loaded = await loadStoredPrivateKeyPem(pool, appConfig);
      if (!loaded) throw new Error("No saved private key to test with.");
      privateKey = loaded;
    } else {
      throw new Error("Private key is required to test unsaved form values (or enable use stored private key).");
    }
  } else {
    runtime = await resolveDocusignRuntimeConfig(pool, appConfig);
    const loaded = await loadStoredPrivateKeyPem(pool, appConfig);
    if (!loaded) throw new Error("RSA private key is not configured.");
    privateKey = loaded;
  }

  await getDocusignAccessToken(runtime, privateKey);
  const consentUrl = buildDocuSignJwtConsentUrl(runtime);
  return {
    message: `DocuSign JWT authentication succeeded (${runtime.environment}, account ${runtime.accountId}).`,
    consentUrl,
  };
}

export function getConsentUrlForRuntime(runtime: DocusignRuntimeConfig): string {
  return buildDocuSignJwtConsentUrl(runtime);
}
