import type { DocusignRuntimeConfig } from "./docusignRuntimeConfig.js";
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

type CachedToken = { accessToken: string; expiresAtMs: number; cacheKey: string };

let tokenCache: CachedToken | null = null;

export function clearDocusignTokenCache(): void {
  tokenCache = null;
}

function tokenCacheKey(runtime: DocusignRuntimeConfig): string {
  return `${runtime.integrationKey}:${runtime.userId}:${runtime.accountId}`;
}

export function assertDocusignConfigured(runtime: DocusignRuntimeConfig): void {
  if (!runtime.integrationKey || !runtime.userId || !runtime.accountId) {
    throw new Error("Integration Key, User ID, and Account ID must be set.");
  }
}

function oauthHostToHttpsOrigin(host: string): string {
  const h = host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${h}`;
}

/** One-time JWT impersonation consent (open while logged in as `userId`). */
export function buildDocuSignJwtConsentUrl(runtime: DocusignRuntimeConfig): string {
  const origin = oauthHostToHttpsOrigin(runtime.oauthHost);
  const scope = encodeURIComponent("signature impersonation");
  const clientId = encodeURIComponent(runtime.integrationKey);
  const redirect = encodeURIComponent(runtime.consentRedirectUri);
  return `${origin}/oauth/auth?response_type=code&scope=${scope}&client_id=${clientId}&redirect_uri=${redirect}`;
}

/** docusign-esign may return `{ body: { access_token } }`, axios data, or bare `{ access_token }`. */
function parseJwtTokenResponse(
  result: unknown,
  defaultExpiresIn: number
): { accessToken: string; expiresIn: number } | null {
  if (result == null || typeof result !== "object") return null;
  const root = result as Record<string, unknown>;
  const nested =
    root.body && typeof root.body === "object" ? (root.body as Record<string, unknown>) : root;
  const accessToken =
    typeof nested.access_token === "string"
      ? nested.access_token
      : typeof nested.accessToken === "string"
        ? nested.accessToken
        : null;
  if (!accessToken) return null;
  const expRaw = nested.expires_in ?? nested.expiresIn;
  const expiresIn =
    typeof expRaw === "number" && Number.isFinite(expRaw) ? expRaw : defaultExpiresIn;
  return { accessToken, expiresIn };
}

function requestJwtUserTokenAsync(
  apiClient: InstanceType<DocusignSdk["ApiClient"]>,
  integrationKey: string,
  userId: string,
  scopes: string[],
  pem: string,
  expiresIn: number
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const cb = (err: Error | null, res?: unknown) => {
      if (err) reject(err);
      else resolve(res);
    };
    try {
      const ret = apiClient.requestJWTUserToken(
        integrationKey,
        userId,
        scopes,
        pem,
        expiresIn,
        cb
      );
      if (ret && typeof (ret as Promise<unknown>).then === "function") {
        (ret as Promise<unknown>).then(resolve).catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

export async function getDocusignAccessToken(
  runtime: DocusignRuntimeConfig,
  privateKeyPem: string
): Promise<string> {
  assertDocusignConfigured(runtime);
  const pem = privateKeyPem.trim();
  if (!pem) {
    throw new Error("DocuSign RSA private key is not configured.");
  }

  const cacheKey = tokenCacheKey(runtime);
  const now = Date.now();
  if (tokenCache && tokenCache.cacheKey === cacheKey && now < tokenCache.expiresAtMs - 120_000) {
    return tokenCache.accessToken;
  }

  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(runtime.basePath.replace(/\/+$/, ""));
  apiClient.setOAuthBasePath(runtime.oauthHost.replace(/^https?:\/\//, "").replace(/\/+$/, ""));

  const scopes = ["signature", "impersonation"];
  const expiresIn = 3600;

  let rawResult: unknown;
  try {
    rawResult = await requestJwtUserTokenAsync(
      apiClient,
      runtime.integrationKey,
      runtime.userId,
      scopes,
      pem,
      expiresIn
    );
  } catch (err) {
    const { error, errorDescription } = readJwtGrantErrorFields(err);
    if (error === "consent_required") {
      const url = buildDocuSignJwtConsentUrl(runtime);
      const oauthOrigin = oauthHostToHttpsOrigin(runtime.oauthHost);
      throw new Error(
        `DocuSign consent required for user ${runtime.userId}. Sign in to DocuSign (${runtime.environment}) as that user, then open: ${url} ` +
          `(must use ${oauthOrigin}, not www.docusign.com for the consent host).`
      );
    }
    if (error === "invalid_grant" || errorDescription?.includes("no_valid_keys_or_signatures")) {
      throw new Error(
        `DocuSign rejected the RSA key for integration ${runtime.integrationKey}. ` +
          `Register the matching public key in DocuSign Admin → Apps and Keys, then save the correct private key in Settings → DocuSign.`
      );
    }
    const detail = errorDescription || (err instanceof Error ? err.message : String(err));
    throw new Error(`DocuSign JWT authentication failed: ${detail}`);
  }

  const parsed = parseJwtTokenResponse(rawResult, expiresIn);
  if (!parsed) {
    throw new Error("DocuSign JWT grant returned no access token.");
  }
  tokenCache = {
    accessToken: parsed.accessToken,
    expiresAtMs: now + parsed.expiresIn * 1000,
    cacheKey,
  };
  return parsed.accessToken;
}

export function createConfiguredApiClient(runtime: DocusignRuntimeConfig, accessToken: string) {
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(runtime.basePath.replace(/\/+$/, ""));
  apiClient.setOAuthBasePath(runtime.oauthHost.replace(/^https?:\/\//, "").replace(/\/+$/, ""));
  apiClient.setJWTToken(accessToken);
  return apiClient;
}
