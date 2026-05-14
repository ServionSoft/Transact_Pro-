import fs from "node:fs";
import type { AppConfig } from "../../config/env.js";
import docusignPkg from "docusign-esign";

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

  const result = await new Promise<{ body?: { access_token?: string; expires_in?: number } }>((resolve, reject) => {
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
