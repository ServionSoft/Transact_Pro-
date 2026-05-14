import fs from "node:fs";
import type { AppConfig } from "../../config/env.js";
import docusignPkg from "docusign-esign";

/** OAuth token errors often arrive as axios `response.data` (object, JSON string, or Buffer). */
function readJwtGrantErrorFields(err: unknown): { error?: string; errorDescription?: string } {
  if (!err || typeof err !== "object") return {};
  const res = (err as { response?: { data?: unknown } }).response;
  const raw = res?.data;
  let parsed: unknown = raw;
  if (Buffer.isBuffer(raw)) {
    const t = raw.toString("utf8").trim();
    if (!t) return {};
    try {
      parsed = JSON.parse(t) as unknown;
    } catch {
      return {};
    }
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object") return {};
  const o = parsed as Record<string, unknown>;
  const error = typeof o.error === "string" ? o.error : undefined;
  const errorDescription = typeof o.error_description === "string" ? o.error_description : undefined;
  return { error, errorDescription };
}

type DocusignSdk = {
  ApiClient: new (opts?: object) => {
    setBasePath(path: string): void;
    setOAuthBasePath(host: string): void;
    setJWTToken(token: string): void;
    getOAuthBasePath(): string;
    requestJWTUserToken(
      clientId: string,
      userId: string,
      scopes: string[],
      rsaPrivateKey: string,
      expiresIn: number,
      callback: (err: Error | null, res: { body?: { access_token?: string; expires_in?: number } }) => void
    ): Promise<{ body?: { access_token?: string; expires_in?: number } }>;
  };
};

const docusign = docusignPkg as unknown as DocusignSdk;

type CachedToken = { accessToken: string; expiresAtMs: number };

let tokenCache: CachedToken | null = null;

export function assertDocusignConfigured(config: AppConfig): void {
  if (!config.docusignIntegrationKey || !config.docusignUserId || !config.docusignAccountId) {
    throw new Error("DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, and DOCUSIGN_ACCOUNT_ID must be set.");
  }
  if (!config.docusignRsaPrivateKey && !config.docusignRsaPrivateKeyPath) {
    throw new Error("DOCUSIGN_RSA_PRIVATE_KEY or DOCUSIGN_RSA_PRIVATE_KEY_PATH must be set.");
  }
}

export function loadDocusignPrivateKeyPem(config: AppConfig): string {
  if (config.docusignRsaPrivateKey?.trim()) {
    return config.docusignRsaPrivateKey.trim();
  }
  if (config.docusignRsaPrivateKeyPath) {
    return fs.readFileSync(config.docusignRsaPrivateKeyPath, "utf8");
  }
  throw new Error("DocuSign RSA private key is not configured.");
}

function oauthHostToHttpsOrigin(host: string): string {
  const h = host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${h}`;
}

/** One-time JWT impersonation consent (open while logged in as `DOCUSIGN_USER_ID`). */
export function buildDocuSignJwtConsentUrl(config: AppConfig): string {
  const origin = oauthHostToHttpsOrigin(config.docusignOAuthHost);
  const scope = encodeURIComponent("signature impersonation");
  const clientId = encodeURIComponent(config.docusignIntegrationKey ?? "");
  const redirect = encodeURIComponent(config.docusignConsentRedirectUri);
  return `${origin}/oauth/auth?response_type=code&scope=${scope}&client_id=${clientId}&redirect_uri=${redirect}`;
}

export async function getDocusignAccessToken(config: AppConfig): Promise<string> {
  assertDocusignConfigured(config);
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAtMs - 120_000) {
    return tokenCache.accessToken;
  }
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(config.docusignBasePath.replace(/\/+$/, ""));
  apiClient.setOAuthBasePath(config.docusignOAuthHost.replace(/^https?:\/\//, "").replace(/\/+$/, ""));

  const privateKey = loadDocusignPrivateKeyPem(config);
  const scopes = ["signature", "impersonation"];
  const expiresIn = 3600;

  let result: { body?: { access_token?: string; expires_in?: number } };
  try {
    result = await new Promise<{ body?: { access_token?: string; expires_in?: number } }>((resolve, reject) => {
      apiClient.requestJWTUserToken(
        config.docusignIntegrationKey!,
        config.docusignUserId!,
        scopes,
        privateKey,
        expiresIn,
        (err: Error | null, res: { body?: { access_token?: string; expires_in?: number } }) => {
          if (err) reject(err);
          else resolve(res);
        }
      );
    });
  } catch (err) {
    const { error, errorDescription } = readJwtGrantErrorFields(err);
    const desc = errorDescription ?? "";
    const needsConsent =
      error === "consent_required" || (error === "invalid_grant" && desc.toLowerCase().includes("consent_required"));
    if (needsConsent) {
      const url = buildDocuSignJwtConsentUrl(config);
      const oauthOrigin = oauthHostToHttpsOrigin(config.docusignOAuthHost);
      throw new Error(
        "DocuSign JWT: one-time consent is required for this Integration Key and impersonated user (" +
          `${config.docusignUserId}). Sign in to DocuSign demo as that user, then open this URL (must start with ${oauthOrigin} — ` +
          `not www.docusign.com; www.docusign.com is only the redirect landing): ${url} ` +
          `If you see redirect_uri mismatch, add "${config.docusignConsentRedirectUri}" to Redirect URIs in Apps and Keys and Save.`
      );
    }
    if (error === "invalid_grant" && desc.includes("no_valid_keys_or_signatures")) {
      throw new Error(
        "DocuSign JWT: private key does not match the public key on this Integration Key (or no RSA public key is registered). " +
          "In DocuSign Admin → Apps and Keys → your app (Integration Key " +
          `${config.docusignIntegrationKey}), add the RSA public key that pairs with the PEM in DOCUSIGN_RSA_PRIVATE_KEY / DOCUSIGN_RSA_PRIVATE_KEY_PATH. ` +
          "Regenerate an RSA keypair in DocuSign if needed, save the public key there, replace the private PEM on the server, restart the API, then complete consent for this user if prompted."
      );
    }
    if (error === "invalid_grant") {
      throw new Error(`DocuSign JWT invalid_grant: ${desc || (err instanceof Error ? err.message : String(err))}`);
    }
    throw err instanceof Error ? err : new Error(String(err));
  }

  const accessToken = result.body?.access_token;
  if (!accessToken) {
    throw new Error("DocuSign JWT exchange returned no access_token.");
  }
  const ttlSec = typeof result.body?.expires_in === "number" ? result.body.expires_in : expiresIn;
  tokenCache = { accessToken, expiresAtMs: now + ttlSec * 1000 };
  return accessToken;
}

export function createConfiguredApiClient(config: AppConfig, accessToken: string) {
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(config.docusignBasePath.replace(/\/+$/, ""));
  apiClient.setOAuthBasePath(config.docusignOAuthHost.replace(/^https?:\/\//, "").replace(/\/+$/, ""));
  apiClient.setJWTToken(accessToken);
  return apiClient;
}
