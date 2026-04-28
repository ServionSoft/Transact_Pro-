import type { Pool } from "pg";

export type RoleProfileListItem = {
  id: string;
  name: string;
  description: string | null;
  defaultDesignation: string | null;
  isSystem: boolean;
};

export type RoleProfileDetail = RoleProfileListItem & {
  permissionKeys: string[];
};

export type ServiceError = { status: number; code: string; message: string };

export async function listRoleProfiles(pool: Pool): Promise<RoleProfileListItem[]> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    default_designation: string | null;
    is_system: boolean;
  }>(
    `SELECT id::text, name, description, default_designation, is_system
     FROM public.role_profiles
     WHERE deleted_at IS NULL
     ORDER BY is_system DESC, lower(name)`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    defaultDesignation: r.default_designation,
    isSystem: r.is_system,
  }));
}

export async function getRoleProfileById(pool: Pool, id: string): Promise<RoleProfileDetail | null> {
  if (!/^\d+$/.test(id)) return null;
  const { rows } = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    default_designation: string | null;
    is_system: boolean;
  }>(
    `SELECT id::text, name, description, default_designation, is_system
     FROM public.role_profiles
     WHERE id = $1::bigint AND deleted_at IS NULL`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  const { rows: pk } = await pool.query<{ key: string }>(
    `SELECT p.key
     FROM public.role_profile_permissions rpp
     JOIN public.permissions p ON p.id = rpp.permission_id
     WHERE rpp.role_profile_id = $1::bigint AND rpp.allowed = true AND p.is_active = true
     ORDER BY p.module, p.key`,
    [id]
  );
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    defaultDesignation: row.default_designation,
    isSystem: row.is_system,
    permissionKeys: pk.map((x) => x.key),
  };
}

export async function getRoleProfileDefaultDesignation(pool: Pool, profileId: string): Promise<string | null> {
  if (!/^\d+$/.test(profileId)) return null;
  const { rows } = await pool.query<{ default_designation: string | null }>(
    `SELECT default_designation
     FROM public.role_profiles
     WHERE id = $1::bigint AND deleted_at IS NULL`,
    [profileId]
  );
  return rows[0]?.default_designation ?? null;
}

async function validatePermissionKeys(pool: Pool, keys: string[]): Promise<string | null> {
  if (keys.length === 0) return "At least one permission is required.";
  const { rows } = await pool.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM public.permissions WHERE is_active = true AND key = ANY($1::text[])`,
    [keys]
  );
  const n = Number(rows[0]?.c ?? 0);
  if (n !== keys.length) return "One or more permission keys are invalid.";
  return null;
}

export async function createRoleProfile(
  pool: Pool,
  input: { name: string; description: string | null; defaultDesignation?: string | null; permissionKeys: string[] }
): Promise<{ profile: RoleProfileDetail } | { error: ServiceError }> {
  const name = input.name.trim();
  if (!name) return { error: { status: 400, code: "INVALID_BODY", message: "Name is required." } };
  const uniq = input.permissionKeys.filter((k, i, a) => a.indexOf(k) === i);
  const err = await validatePermissionKeys(pool, uniq);
  if (err) return { error: { status: 400, code: "INVALID_PERMISSIONS", message: err } };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO public.role_profiles (name, description, default_designation, is_system, created_at, updated_at)
       VALUES ($1, $2, $3, false, now(), now())
       RETURNING id::text`,
      [name, input.description?.trim() || null, input.defaultDesignation?.trim() || null]
    );
    const id = rows[0]!.id;
    for (const key of uniq) {
      await client.query(
        `INSERT INTO public.role_profile_permissions (role_profile_id, permission_id, allowed, created_at)
         SELECT $1::bigint, p.id, true, now()
         FROM public.permissions p WHERE p.key = $2 AND p.is_active = true`,
        [id, key]
      );
    }
    await client.query("COMMIT");
    const profile = await getRoleProfileById(pool, id);
    return { profile: profile! };
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : "";
    if (/role_profiles_name_active_lower/i.test(msg) || /unique/i.test(msg)) {
      return { error: { status: 409, code: "NAME_TAKEN", message: "A role with this name already exists." } };
    }
    return { error: { status: 500, code: "CREATE_FAILED", message: msg || "Could not create role profile." } };
  } finally {
    client.release();
  }
}

export async function updateRoleProfile(
  pool: Pool,
  id: string,
  input: { name?: string; description?: string | null; defaultDesignation?: string | null; permissionKeys?: string[] }
): Promise<{ profile: RoleProfileDetail } | { error: ServiceError }> {
  if (!/^\d+$/.test(id)) return { error: { status: 404, code: "NOT_FOUND", message: "Role profile not found." } };
  const existing = await getRoleProfileById(pool, id);
  if (!existing) return { error: { status: 404, code: "NOT_FOUND", message: "Role profile not found." } };

  if (input.permissionKeys != null) {
    const uniq = input.permissionKeys.filter((k, i, a) => a.indexOf(k) === i);
    const err = await validatePermissionKeys(pool, uniq);
    if (err) return { error: { status: 400, code: "INVALID_PERMISSIONS", message: err } };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (input.name != null || input.description !== undefined || input.defaultDesignation !== undefined) {
      const name = input.name != null ? input.name.trim() : existing.name;
      if (!name) {
        await client.query("ROLLBACK");
        return { error: { status: 400, code: "INVALID_BODY", message: "Name is required." } };
      }
      const desc =
        input.description !== undefined ? (input.description === null ? null : input.description.trim() || null) : undefined;
      const defaultDesignation =
        input.defaultDesignation !== undefined
          ? input.defaultDesignation === null
            ? null
            : input.defaultDesignation.trim() || null
          : existing.defaultDesignation ?? null;
      if (desc !== undefined) {
        await client.query(
          `UPDATE public.role_profiles
           SET name = $1, description = $2, default_designation = $3, updated_at = now()
           WHERE id = $4::bigint AND deleted_at IS NULL`,
          [name, desc, defaultDesignation, id]
        );
      } else {
        await client.query(
          `UPDATE public.role_profiles
           SET name = $1, default_designation = $2, updated_at = now()
           WHERE id = $3::bigint AND deleted_at IS NULL`,
          [name, defaultDesignation, id]
        );
      }
    }
    if (input.permissionKeys != null) {
      const uniq = input.permissionKeys.filter((k, i, a) => a.indexOf(k) === i);
      await client.query(`DELETE FROM public.role_profile_permissions WHERE role_profile_id = $1::bigint`, [id]);
      for (const key of uniq) {
        await client.query(
          `INSERT INTO public.role_profile_permissions (role_profile_id, permission_id, allowed, created_at)
           SELECT $1::bigint, p.id, true, now()
           FROM public.permissions p WHERE p.key = $2 AND p.is_active = true`,
          [id, key]
        );
      }
      await client.query(`UPDATE public.role_profiles SET updated_at = now() WHERE id = $1::bigint`, [id]);
    }
    await client.query("COMMIT");
    const profile = await getRoleProfileById(pool, id);
    return { profile: profile! };
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : "";
    if (/role_profiles_name_active_lower/i.test(msg) || /unique/i.test(msg)) {
      return { error: { status: 409, code: "NAME_TAKEN", message: "A role with this name already exists." } };
    }
    return { error: { status: 500, code: "UPDATE_FAILED", message: msg || "Could not update role profile." } };
  } finally {
    client.release();
  }
}

export async function deleteRoleProfile(pool: Pool, id: string): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(id)) return { error: { status: 404, code: "NOT_FOUND", message: "Role profile not found." } };
  const existing = await pool.query<{ is_system: boolean }>(
    `SELECT is_system FROM public.role_profiles WHERE id = $1::bigint AND deleted_at IS NULL`,
    [id]
  );
  if (!existing.rowCount) return { error: { status: 404, code: "NOT_FOUND", message: "Role profile not found." } };
  if (existing.rows[0]!.is_system) {
    return { error: { status: 403, code: "FORBIDDEN", message: "System role profiles cannot be deleted." } };
  }
  const { rows: ref } = await pool.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM public.users WHERE role_profile_id = $1::bigint AND deleted_at IS NULL`,
    [id]
  );
  if (Number(ref[0]?.c ?? 0) > 0) {
    return {
      error: {
        status: 409,
        code: "PROFILE_IN_USE",
        message: "This profile is assigned to one or more users. Reassign them before deleting.",
      },
    };
  }
  await pool.query(
    `UPDATE public.role_profiles SET deleted_at = now(), updated_at = now() WHERE id = $1::bigint AND deleted_at IS NULL`,
    [id]
  );
  return { ok: true };
}

export async function roleProfileExistsActive(pool: Pool, id: string): Promise<boolean> {
  if (!/^\d+$/.test(id)) return false;
  const { rows } = await pool.query<{ n: string }>(
    `SELECT 1::text AS n FROM public.role_profiles WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
    [id]
  );
  return rows.length > 0;
}
