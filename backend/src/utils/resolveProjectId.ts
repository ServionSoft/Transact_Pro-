import type { AppConfig } from "../config/env.js";

/**
 * Resolves API path `:projectId` to numeric `projects.id`.
 * Frontend uses `crm-doc-vault`; DB uses bigint (e.g. 1 from seed).
 */
export function resolveNumericProjectId(
  projectIdParam: string,
  config: AppConfig
): number | null {
  const p = projectIdParam.trim();
  if (p === config.crmVaultSlug) return config.crmVaultProjectId;
  if (/^\d+$/.test(p)) return Number(p);
  return null;
}
