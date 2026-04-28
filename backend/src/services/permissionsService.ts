import type { Pool } from "pg";

export type AppRole = "super_admin" | "admin" | "coordinator";
const NON_SUPER_BASE_ROLE: AppRole = "coordinator";

const ALL_PERMISSION_KEYS: string[] = [
  "settings.access",
  "settings.manage_general",
  "settings.manage_integrations",
  "project_access.global",
  "projects.view",
  "projects.create",
  "projects.edit",
  "projects.archive",
  "projects.restore",
  "projects.delete",
  "projects.assign_members",
  "projects.reassign_owner",
  "team_members.view",
  "team_members.create",
  "team_members.invite",
  "team_members.edit",
  "team_members.delete",
  "team_members.deactivate",
  "team_members.assign_permissions",
  "team_members.assign_projects",
  "clients.view",
  "clients.create",
  "clients.edit",
  "clients.archive",
  "clients.restore",
  "clients.delete_permanent",
  "documents.view",
  "documents.download",
  "documents.upload",
  "documents.move",
  "documents.delete",
  "documents.folders.create",
  "documents.folders.delete",
  "document_rules.view",
  "document_rules.create",
  "document_rules.edit",
  "document_rules.delete",
  "document_rules.toggle_active",
  "role_profiles.view",
  "role_profiles.create",
  "role_profiles.edit",
  "role_profiles.delete",
];

export async function listAllPermissionKeys(pool: Pool): Promise<string[]> {
  const { rows } = await pool.query<{ key: string }>(
    `SELECT key FROM public.permissions WHERE is_active = true ORDER BY module, key`
  );
  if (rows.length === 0) return ALL_PERMISSION_KEYS;
  return rows.map((r) => r.key);
}

export async function getEffectivePermissionKeys(pool: Pool, userId: string, role: AppRole): Promise<Set<string>> {
  if (role === "super_admin") {
    return new Set(await listAllPermissionKeys(pool));
  }

  const keys = await listAllPermissionKeys(pool);
  const { rows: userProf } = await pool.query<{ role_profile_id: string | null }>(
    `SELECT role_profile_id::text AS role_profile_id FROM public.users WHERE id = $1::bigint`,
    [userId]
  );
  let profileId = userProf[0]?.role_profile_id ?? null;
  if (profileId) {
    const { rows: alive } = await pool.query<{ n: string }>(
      `SELECT 1::text AS n FROM public.role_profiles WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
      [profileId]
    );
    if (alive.length === 0) profileId = null;
  }

  const effective = new Map<string, boolean>();
  for (const k of keys) effective.set(k, false);

  if (profileId) {
    const { rows: profRows } = await pool.query<{ key: string; allowed: boolean }>(
      `SELECT p.key, rpp.allowed
       FROM public.role_profile_permissions rpp
       JOIN public.permissions p ON p.id = rpp.permission_id
       WHERE rpp.role_profile_id = $1::bigint AND p.is_active = true`,
      [profileId]
    );
    for (const r of profRows) {
      effective.set(r.key, r.allowed);
    }
  } else {
    const { rows: roleRows } = await pool.query<{ key: string; allowed: boolean }>(
      `SELECT p.key, rp.allowed
       FROM public.role_permissions rp
       JOIN public.permissions p ON p.id = rp.permission_id
       WHERE rp.role = $1::public.user_role AND p.is_active = true`,
      [NON_SUPER_BASE_ROLE]
    );
    for (const r of roleRows) {
      effective.set(r.key, r.allowed);
    }
  }

  const { rows: userRows } = await pool.query<{ key: string; allowed: boolean }>(
    `SELECT p.key, up.allowed
     FROM public.user_permissions up
     JOIN public.permissions p ON p.id = up.permission_id
     WHERE up.user_id = $1::bigint AND p.is_active = true`,
    [userId]
  );
  for (const r of userRows) {
    effective.set(r.key, r.allowed);
  }

  const granted = new Set<string>();
  for (const [k, v] of effective) {
    if (v) granted.add(k);
  }
  return granted;
}

export async function userHasPermission(pool: Pool, userId: string, role: AppRole, key: string): Promise<boolean> {
  const set = await getEffectivePermissionKeys(pool, userId, role);
  return set.has(key);
}

/** Keys granted by role defaults only (no user overrides). */
export async function defaultPermissionKeysForRole(pool: Pool, role: AppRole): Promise<Set<string>> {
  if (role === "super_admin") {
    return new Set(await listAllPermissionKeys(pool));
  }
  const { rows } = await pool.query<{ key: string }>(
    `SELECT p.key
     FROM public.role_permissions rp
     JOIN public.permissions p ON p.id = rp.permission_id
     WHERE rp.role = $1::public.user_role AND rp.allowed = true AND p.is_active = true`,
    [NON_SUPER_BASE_ROLE]
  );
  return new Set(rows.map((r) => r.key));
}

/** Build minimal user_permission rows so effective keys match desiredKeys. */
export async function overridesFromDesiredKeys(
  pool: Pool,
  role: AppRole,
  desiredKeys: string[]
): Promise<{ key: string; allowed: boolean }[]> {
  const defaults = await defaultPermissionKeysForRole(pool, role);
  const desired = new Set(desiredKeys);
  const all = await listAllPermissionKeys(pool);
  const out: { key: string; allowed: boolean }[] = [];
  for (const k of all) {
    const def = defaults.has(k);
    const want = desired.has(k);
    if (def !== want) out.push({ key: k, allowed: want });
  }
  return out;
}

export async function defaultPermissionKeysForProfile(pool: Pool, roleProfileId: string): Promise<Set<string>> {
  if (!/^\d+$/.test(roleProfileId)) return new Set();
  const { rows } = await pool.query<{ key: string }>(
    `SELECT p.key
     FROM public.role_profile_permissions rpp
     JOIN public.permissions p ON p.id = rpp.permission_id
     JOIN public.role_profiles rp ON rp.id = rpp.role_profile_id
     WHERE rpp.role_profile_id = $1::bigint AND rpp.allowed = true AND p.is_active = true AND rp.deleted_at IS NULL`,
    [roleProfileId]
  );
  return new Set(rows.map((r) => r.key));
}

/** Overrides vs a named profile (for assign_permissions + desired keys). */
export async function overridesFromDesiredKeysForProfile(
  pool: Pool,
  roleProfileId: string,
  desiredKeys: string[]
): Promise<{ key: string; allowed: boolean }[]> {
  const defaults = await defaultPermissionKeysForProfile(pool, roleProfileId);
  const desired = new Set(desiredKeys);
  const all = await listAllPermissionKeys(pool);
  const out: { key: string; allowed: boolean }[] = [];
  for (const k of all) {
    const def = defaults.has(k);
    const want = desired.has(k);
    if (def !== want) out.push({ key: k, allowed: want });
  }
  return out;
}
