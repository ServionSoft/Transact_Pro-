/** Resolved DocuSign JWT settings used at send/sync time (from DB and/or env fallback). */
export type DocusignRuntimeConfig = {
  integrationKey: string;
  userId: string;
  accountId: string;
  basePath: string;
  oauthHost: string;
  consentRedirectUri: string;
  connectHmacKey: string | undefined;
  environment: "demo" | "production";
  source: "database" | "environment";
};

export const DOCUSIGN_DEMO = {
  basePath: "https://demo.docusign.net/restapi",
  oauthHost: "account-d.docusign.com",
} as const;

export const DOCUSIGN_PRODUCTION = {
  basePath: "https://www.docusign.net/restapi",
  oauthHost: "account.docusign.com",
} as const;

export function hostsForEnvironment(env: "demo" | "production"): { basePath: string; oauthHost: string } {
  return env === "production" ? { ...DOCUSIGN_PRODUCTION } : { ...DOCUSIGN_DEMO };
}
