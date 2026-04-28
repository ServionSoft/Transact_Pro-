import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Pool, PoolClient } from "pg";
import type { AppRole } from "./permissionsService.js";
import {
  getEffectivePermissionKeys,
  overridesFromDesiredKeys,
  overridesFromDesiredKeysForProfile,
} from "./permissionsService.js";
import { getRoleProfileDefaultDesignation, roleProfileExistsActive } from "./roleProfilesService.js";

export type ServiceError = { status: number; code: string; message: string };

export type TeamMemberRow = {
  id: string;
  name: string;
  designation: string | null;
  email: string;
  role: AppRole;
  status: "active" | "invited" | "inactive";
  lastActiveAt: string | null;
  createdAt: string;
  roleProfileId: string | null;
  roleProfileName: string | null;
};

export type TeamMemberDetail = TeamMemberRow & {
  permissionKeys: string[];
  permissionOverrides: { key: string; allowed: boolean }[];
  projectIds: string[];
};

function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

async function permissionIdByKey(pool: Pool, key: string): Promise<number | null> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id::text FROM public.permissions WHERE key = $1 LIMIT 1`,
    [key]
  );
  return rows[0] ? Number(rows[0].id) : null;
}

type DbClient = Pool | PoolClient;

async function replaceUserPermissions(
  db: DbClient,
  poolForLookups: Pool,
  userId: string,
  overrides: { key: string; allowed: boolean }[],
  _actorId: string | null
): Promise<void> {
  await db.query(`DELETE FROM public.user_permissions WHERE user_id = $1::bigint`, [userId]);
  for (const o of overrides) {
    const pid = await permissionIdByKey(poolForLookups, o.key);
    if (!pid) continue;
    await db.query(
      `INSERT INTO public.user_permissions (user_id, permission_id, allowed, created_at, updated_at)
       VALUES ($1::bigint, $2::bigint, $3, now(), now())`,
      [userId, pid, o.allowed]
    );
  }
  void _actorId;
}

async function replaceProjectAssignments(db: DbClient, userId: string, projectIds: string[]): Promise<void> {
  await db.query(`DELETE FROM public.project_assignments WHERE user_id = $1::bigint`, [userId]);
  for (const pid of projectIds) {
    if (!/^\d+$/.test(pid)) continue;
    await db.query(
      `INSERT INTO public.project_assignments (project_id, user_id, assigned_by_user_id, created_at, updated_at)
       VALUES ($1::bigint, $2::bigint, NULL, now(), now())
       ON CONFLICT (project_id, user_id) DO NOTHING`,
      [pid, userId]
    );
  }
}

export async function listTeamMembers(pool: Pool): Promise<TeamMemberRow[]> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    designation: string | null;
    email: string;
    role: string;
    status: string;
    last_active_at: Date | null;
    created_at: Date;
    role_profile_id: string | null;
    role_profile_name: string | null;
  }>(
    `SELECT u.id::text, u.name, u.designation, u.email, u.role::text AS role, u.status::text AS status,
            u.last_active_at, u.created_at,
            u.role_profile_id::text AS role_profile_id,
            rp.name AS role_profile_name
     FROM public.users u
     LEFT JOIN public.role_profiles rp ON rp.id = u.role_profile_id AND rp.deleted_at IS NULL
     WHERE u.deleted_at IS NULL
     ORDER BY u.name ASC`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    designation: r.designation,
    email: r.email,
    role: r.role as AppRole,
    status: r.status as TeamMemberRow["status"],
    lastActiveAt: r.last_active_at ? r.last_active_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
    roleProfileId: r.role_profile_id,
    roleProfileName: r.role_profile_name,
  }));
}

export async function getTeamMemberById(pool: Pool, id: string): Promise<TeamMemberDetail | null> {
  if (!/^\d+$/.test(id)) return null;
  const { rows } = await pool.query<{
    id: string;
    name: string;
    designation: string | null;
    email: string;
    role: string;
    status: string;
    last_active_at: Date | null;
    created_at: Date;
    role_profile_id: string | null;
    role_profile_name: string | null;
  }>(
    `SELECT u.id::text, u.name, u.designation, u.email, u.role::text AS role, u.status::text AS status,
            u.last_active_at, u.created_at,
            u.role_profile_id::text AS role_profile_id,
            rp.name AS role_profile_name
     FROM public.users u
     LEFT JOIN public.role_profiles rp ON rp.id = u.role_profile_id AND rp.deleted_at IS NULL
     WHERE u.id = $1::bigint AND u.deleted_at IS NULL`,
    [id]
  );
  const r = rows[0];
  if (!r) return null;
  const role = r.role as AppRole;
  const permSet = await getEffectivePermissionKeys(pool, r.id, role);
  const { rows: ov } = await pool.query<{ key: string; allowed: boolean }>(
    `SELECT p.key, up.allowed
     FROM public.user_permissions up
     JOIN public.permissions p ON p.id = up.permission_id
     WHERE up.user_id = $1::bigint`,
    [id]
  );
  const { rows: pj } = await pool.query<{ project_id: string }>(
    `SELECT project_id::text FROM public.project_assignments WHERE user_id = $1::bigint`,
    [id]
  );
  return {
    id: r.id,
    name: r.name,
    designation: r.designation,
    email: r.email,
    role,
    status: r.status as TeamMemberRow["status"],
    lastActiveAt: r.last_active_at ? r.last_active_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
    roleProfileId: r.role_profile_id,
    roleProfileName: r.role_profile_name,
    permissionKeys: [...permSet],
    permissionOverrides: ov.map((x) => ({ key: x.key, allowed: x.allowed })),
    projectIds: pj.map((x) => x.project_id),
  };
}

type CreateInput = {
  name: string;
  designation?: string | null;
  email: string;
  password: string;
  role: AppRole;
  status: "active" | "invited" | "inactive";
  roleProfileId: string | null;
  permissionOverrides: { key: string; allowed: boolean }[];
  /** If set, overrides are computed vs role defaults so effective permissions match this set. */
  desiredPermissionKeys?: string[] | null;
  projectIds: string[];
};

export async function createTeamMember(
  pool: Pool,
  input: CreateInput,
  actorRole: AppRole,
  actorId: string
): Promise<{ user: TeamMemberDetail } | { error: ServiceError }> {
  if (actorRole !== "super_admin" && input.role === "super_admin") {
    return { error: { status: 403, code: "FORBIDDEN", message: "Only super admins can assign the super_admin role." } };
  }
  if (input.role === "super_admin" && input.roleProfileId) {
    return { error: { status: 400, code: "INVALID_BODY", message: "Super admin accounts do not use a permission profile." } };
  }
  const roleForInsert: AppRole = input.role === "super_admin" ? "super_admin" : "coordinator";
  if (input.role !== "super_admin") {
    if (!input.roleProfileId || !/^\d+$/.test(input.roleProfileId)) {
      return { error: { status: 400, code: "INVALID_BODY", message: "A permission profile is required for this role." } };
    }
    const okProf = await roleProfileExistsActive(pool, input.roleProfileId);
    if (!okProf) {
      return { error: { status: 400, code: "INVALID_PROFILE", message: "Permission profile not found." } };
    }
  }
  const effectiveDesignation =
    input.designation !== undefined
      ? input.designation?.trim() || null
      : input.roleProfileId
        ? await getRoleProfileDefaultDesignation(pool, input.roleProfileId)
        : null;
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim() || !email || !input.password || input.password.length < 8) {
    return { error: { status: 400, code: "INVALID_BODY", message: "Name, email, and password (min 8 chars) are required." } };
  }
  const dup = await pool.query(`SELECT 1 FROM public.users WHERE LOWER(email) = $1 AND deleted_at IS NULL LIMIT 1`, [email]);
  if (dup.rowCount) {
    return { error: { status: 409, code: "EMAIL_TAKEN", message: "A user with this email already exists." } };
  }
  const hash = await bcrypt.hash(input.password, 12);
  let overrides = input.permissionOverrides;
  if (input.desiredPermissionKeys != null && input.desiredPermissionKeys.length > 0) {
    if (input.roleProfileId) {
      overrides = await overridesFromDesiredKeysForProfile(pool, input.roleProfileId, input.desiredPermissionKeys);
    } else {
      overrides = await overridesFromDesiredKeys(pool, roleForInsert, input.desiredPermissionKeys);
    }
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const profileSql =
      roleForInsert === "super_admin"
        ? `INSERT INTO public.users (name, designation, email, password_hash, role, status, role_profile_id, joined_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5::public.user_role, $6::public.user_status, NULL,
               CASE WHEN $6::text = 'active' THEN now() ELSE NULL END,
               now(), now())
           RETURNING id::text`
        : `INSERT INTO public.users (name, designation, email, password_hash, role, status, role_profile_id, joined_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5::public.user_role, $6::public.user_status, $7::bigint,
               CASE WHEN $6::text = 'active' THEN now() ELSE NULL END,
               now(), now())
           RETURNING id::text`;
    const profileParams =
      roleForInsert === "super_admin"
        ? [input.name.trim(), effectiveDesignation, email, hash, roleForInsert, input.status]
        : [input.name.trim(), effectiveDesignation, email, hash, roleForInsert, input.status, input.roleProfileId];
    const { rows } = await client.query<{ id: string }>(profileSql, profileParams);
    const id = rows[0]!.id;
    if (overrides.length) {
      await replaceUserPermissions(client, pool, id, overrides, actorId);
    }
    if (input.projectIds.length) {
      await replaceProjectAssignments(client, id, input.projectIds);
    }
    await client.query("COMMIT");
    const u = await getTeamMemberById(pool, id);
    return { user: u! };
  } catch (e) {
    await client.query("ROLLBACK");
    return { error: { status: 500, code: "CREATE_FAILED", message: e instanceof Error ? e.message : "Create failed." } };
  } finally {
    client.release();
  }
}

export async function inviteTeamMember(
  pool: Pool,
  config: { inviteTtlHours: number; publicAppUrl: string },
  input: {
    name: string;
    designation?: string | null;
    email: string;
    role: AppRole;
    roleProfileId: string | null;
    permissionOverrides: { key: string; allowed: boolean }[];
    desiredPermissionKeys?: string[] | null;
    projectIds: string[];
  },
  actorRole: AppRole,
  actorId: string
): Promise<{ user: TeamMemberDetail; inviteUrl: string; plainToken: string } | { error: ServiceError }> {
  if (actorRole !== "super_admin" && input.role === "super_admin") {
    return { error: { status: 403, code: "FORBIDDEN", message: "Only super admins can assign the super_admin role." } };
  }
  if (input.role === "super_admin" && input.roleProfileId) {
    return { error: { status: 400, code: "INVALID_BODY", message: "Super admin accounts do not use a permission profile." } };
  }
  const roleForInsert: AppRole = input.role === "super_admin" ? "super_admin" : "coordinator";
  if (input.role !== "super_admin") {
    if (!input.roleProfileId || !/^\d+$/.test(input.roleProfileId)) {
      return { error: { status: 400, code: "INVALID_BODY", message: "A permission profile is required for this role." } };
    }
    const okProf = await roleProfileExistsActive(pool, input.roleProfileId);
    if (!okProf) {
      return { error: { status: 400, code: "INVALID_PROFILE", message: "Permission profile not found." } };
    }
  }
  const effectiveDesignation =
    input.designation !== undefined
      ? input.designation?.trim() || null
      : input.roleProfileId
        ? await getRoleProfileDefaultDesignation(pool, input.roleProfileId)
        : null;
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim() || !email) {
    return { error: { status: 400, code: "INVALID_BODY", message: "Name and email are required." } };
  }
  const dup = await pool.query(`SELECT 1 FROM public.users WHERE LOWER(email) = $1 AND deleted_at IS NULL LIMIT 1`, [email]);
  if (dup.rowCount) {
    return { error: { status: 409, code: "EMAIL_TAKEN", message: "A user with this email already exists." } };
  }
  const unusable = randomToken();
  const hash = await bcrypt.hash(unusable, 12);
  const plainToken = randomToken();
  const tokenHash = hashToken(plainToken);
  const expires = new Date(Date.now() + config.inviteTtlHours * 3600 * 1000);
  let overrides = input.permissionOverrides;
  if (input.desiredPermissionKeys != null && input.desiredPermissionKeys.length > 0) {
    if (input.roleProfileId) {
      overrides = await overridesFromDesiredKeysForProfile(pool, input.roleProfileId, input.desiredPermissionKeys);
    } else {
      overrides = await overridesFromDesiredKeys(pool, roleForInsert, input.desiredPermissionKeys);
    }
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inviteSql =
      roleForInsert === "super_admin"
        ? `INSERT INTO public.users (name, designation, email, password_hash, role, status, role_profile_id, joined_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5::public.user_role, 'invited'::public.user_status, NULL, NULL, now(), now())
           RETURNING id::text`
        : `INSERT INTO public.users (name, designation, email, password_hash, role, status, role_profile_id, joined_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5::public.user_role, 'invited'::public.user_status, $6::bigint, NULL, now(), now())
           RETURNING id::text`;
    const inviteParams =
      roleForInsert === "super_admin"
        ? [input.name.trim(), effectiveDesignation, email, hash, roleForInsert]
        : [input.name.trim(), effectiveDesignation, email, hash, roleForInsert, input.roleProfileId];
    const { rows } = await client.query<{ id: string }>(inviteSql, inviteParams);
    const id = rows[0]!.id;
    await client.query(
      `INSERT INTO public.user_invites (email, invited_by_user_id, token, expires_at, user_id, created_at, updated_at)
       VALUES ($1, $2::bigint, $3, $4, $5::bigint, now(), now())`,
      [email, actorId, tokenHash, expires, id]
    );
    if (overrides.length) {
      await replaceUserPermissions(client, pool, id, overrides, actorId);
    }
    if (input.projectIds.length) {
      await replaceProjectAssignments(client, id, input.projectIds);
    }
    await client.query("COMMIT");
    const base = config.publicAppUrl.replace(/\/+$/, "");
    const inviteUrl = `${base}/accept-invite?token=${encodeURIComponent(plainToken)}`;
    const u = await getTeamMemberById(pool, id);
    return { user: u!, inviteUrl, plainToken };
  } catch (e) {
    await client.query("ROLLBACK");
    return { error: { status: 500, code: "INVITE_FAILED", message: e instanceof Error ? e.message : "Invite failed." } };
  } finally {
    client.release();
  }
}

type UpdateInput = {
  name?: string;
  designation?: string | null;
  email?: string;
  role?: AppRole;
  status?: "active" | "invited" | "inactive";
  roleProfileId?: string | null;
  permissionOverrides?: { key: string; allowed: boolean }[] | null;
  desiredPermissionKeys?: string[] | null;
  projectIds?: string[] | null;
};

export async function updateTeamMember(
  pool: Pool,
  id: string,
  input: UpdateInput,
  actorRole: AppRole,
  actorId: string
): Promise<{ user: TeamMemberDetail } | { error: ServiceError }> {
  if (!/^\d+$/.test(id)) return { error: { status: 404, code: "NOT_FOUND", message: "User not found." } };
  if (actorRole !== "super_admin" && input.role === "super_admin") {
    return { error: { status: 403, code: "FORBIDDEN", message: "Only super admins can assign the super_admin role." } };
  }
  const existing = await pool.query<{ role: string }>(
    `SELECT role::text FROM public.users WHERE id = $1::bigint AND deleted_at IS NULL`,
    [id]
  );
  if (!existing.rowCount) return { error: { status: 404, code: "NOT_FOUND", message: "User not found." } };
  const previousRole = existing.rows[0]!.role as AppRole;

  let roleToSet: AppRole | undefined;
  if (input.role === "super_admin") {
    roleToSet = "super_admin";
  } else if (previousRole === "super_admin" && input.roleProfileId && /^\d+$/.test(input.roleProfileId)) {
    roleToSet = "coordinator";
  }

  if (String(actorId) === id && roleToSet === "coordinator" && previousRole === "super_admin") {
    return { error: { status: 400, code: "INVALID", message: "You cannot remove your own super administrator access." } };
  }

  const nextRole = (roleToSet ?? input.role ?? previousRole) as AppRole;
  if (nextRole === "super_admin" && input.roleProfileId) {
    return { error: { status: 400, code: "INVALID_BODY", message: "Super admin accounts do not use a permission profile." } };
  }
  if (input.roleProfileId !== undefined && nextRole !== "super_admin") {
    const pid = input.roleProfileId;
    if (pid == null || !/^\d+$/.test(pid) || !(await roleProfileExistsActive(pool, pid))) {
      return { error: { status: 400, code: "INVALID_PROFILE", message: "Permission profile not found." } };
    }
  }
  if (input.email != null) {
    const em = input.email.trim().toLowerCase();
    const clash = await pool.query(
      `SELECT 1 FROM public.users WHERE LOWER(email) = $1 AND id <> $2::bigint AND deleted_at IS NULL LIMIT 1`,
      [em, id]
    );
    if (clash.rowCount) {
      return { error: { status: 409, code: "EMAIL_TAKEN", message: "Email already in use." } };
    }
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (input.name != null) {
      sets.push(`name = $${i++}`);
      vals.push(input.name.trim());
    }
    if (input.designation !== undefined) {
      sets.push(`designation = $${i++}`);
      vals.push(input.designation === null ? null : input.designation.trim() || null);
    }
    if (input.email != null) {
      sets.push(`email = $${i++}`);
      vals.push(input.email.trim().toLowerCase());
    }
    if (input.designation === undefined && input.roleProfileId && /^\d+$/.test(input.roleProfileId) && roleToSet !== "super_admin") {
      input.designation = await getRoleProfileDefaultDesignation(pool, input.roleProfileId);
    }
    if (roleToSet === "super_admin") {
      sets.push(`role = $${i++}::public.user_role`);
      vals.push("super_admin");
      sets.push(`role_profile_id = NULL`);
    } else {
      if (roleToSet !== undefined) {
        sets.push(`role = $${i++}::public.user_role`);
        vals.push(roleToSet);
      }
      if (input.roleProfileId !== undefined) {
        sets.push(`role_profile_id = $${i++}`);
        vals.push(input.roleProfileId === null || input.roleProfileId === "" ? null : input.roleProfileId);
      }
    }
    if (input.status != null) {
      sets.push(`status = $${i++}::public.user_status`);
      vals.push(input.status);
      if (input.status === "active") {
        sets.push(`joined_at = COALESCE(joined_at, now())`);
      }
    }
    if (sets.length) {
      sets.push("updated_at = now()");
      vals.push(id);
      await client.query(
        `UPDATE public.users SET ${sets.join(", ")} WHERE id = $${i}::bigint AND deleted_at IS NULL`,
        vals
      );
    }
    if (input.desiredPermissionKeys != null && input.desiredPermissionKeys.length > 0) {
      const { rows: cur } = await client.query<{ role_profile_id: string | null }>(
        `SELECT role_profile_id::text FROM public.users WHERE id = $1::bigint`,
        [id]
      );
      const profId = cur[0]?.role_profile_id ?? null;
      const roleForOverrides = (roleToSet ?? input.role ?? previousRole) as AppRole;
      const computed = profId
        ? await overridesFromDesiredKeysForProfile(pool, profId, input.desiredPermissionKeys)
        : await overridesFromDesiredKeys(pool, roleForOverrides, input.desiredPermissionKeys);
      await replaceUserPermissions(client, pool, id, computed, actorId);
    } else if (input.permissionOverrides != null) {
      await replaceUserPermissions(client, pool, id, input.permissionOverrides, actorId);
    } else if (input.roleProfileId !== undefined) {
      await replaceUserPermissions(client, pool, id, [], actorId);
    }
    if (input.projectIds != null) {
      await replaceProjectAssignments(client, id, input.projectIds);
    }
    await client.query("COMMIT");
    const u = await getTeamMemberById(pool, id);
    return { user: u! };
  } catch (e) {
    await client.query("ROLLBACK");
    return { error: { status: 500, code: "UPDATE_FAILED", message: e instanceof Error ? e.message : "Update failed." } };
  } finally {
    client.release();
  }
}

export async function deactivateTeamMember(
  pool: Pool,
  id: string,
  actorId: string
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(id)) return { error: { status: 404, code: "NOT_FOUND", message: "User not found." } };
  if (String(actorId) === id) {
    return { error: { status: 400, code: "INVALID", message: "You cannot deactivate your own account." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.users SET deleted_at = now(), status = 'inactive'::public.user_status, updated_at = now()
     WHERE id = $1::bigint AND deleted_at IS NULL`,
    [id]
  );
  if (!rowCount) return { error: { status: 404, code: "NOT_FOUND", message: "User not found." } };
  return { ok: true };
}

export async function acceptInvite(
  pool: Pool,
  token: string,
  password: string
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!token.trim() || password.length < 8) {
    return { error: { status: 400, code: "INVALID_BODY", message: "Token and password (min 8 chars) are required." } };
  }
  const tokenHash = hashToken(token.trim());
  const { rows } = await pool.query<{ user_id: string }>(
    `SELECT user_id::text
     FROM public.user_invites
     WHERE token = $1 AND accepted_at IS NULL AND expires_at > now() AND user_id IS NOT NULL
     LIMIT 1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row) {
    return { error: { status: 400, code: "INVITE_INVALID", message: "Invalid or expired invitation." } };
  }
  const hash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE public.users SET password_hash = $1, status = 'active'::public.user_status, joined_at = now(), updated_at = now()
       WHERE id = $2::bigint`,
      [hash, row.user_id]
    );
    await client.query(`UPDATE public.user_invites SET accepted_at = now(), updated_at = now() WHERE token = $1`, [tokenHash]);
    await client.query("COMMIT");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK");
    return { error: { status: 500, code: "ACCEPT_FAILED", message: e instanceof Error ? e.message : "Accept failed." } };
  } finally {
    client.release();
  }
}

export async function listProjectsForPicker(pool: Pool): Promise<{ id: string; name: string }[]> {
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id::text, name FROM public.projects ORDER BY name ASC LIMIT 500`
  );
  return rows;
}
