import type { Request, Response } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { currentUser } from "../middleware/auth.js";
import type { AppRole } from "../services/permissionsService.js";
import { defaultPermissionKeysForRole, userHasPermission } from "../services/permissionsService.js";
import {
  acceptInvite,
  createTeamMember,
  deactivateTeamMember,
  getTeamMemberById,
  inviteTeamMember,
  listProjectsForPicker,
  listTeamMembers,
  updateTeamMember,
} from "../services/teamMembersService.js";

function parseOverrides(body: unknown): { key: string; allowed: boolean }[] {
  if (body == null || typeof body !== "object") return [];
  const b = body as Record<string, unknown>;
  const raw = b.permissionOverrides;
  if (!Array.isArray(raw)) return [];
  const out: { key: string; allowed: boolean }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.key !== "string" || typeof o.allowed !== "boolean") continue;
    out.push({ key: o.key.trim(), allowed: o.allowed });
  }
  return out;
}

function parseDesiredPermissionKeys(body: unknown): string[] | undefined {
  if (body == null || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  if (!("desiredPermissionKeys" in b)) return undefined;
  const raw = b.desiredPermissionKeys;
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function parseProjectIds(body: unknown): string[] {
  if (body == null || typeof body !== "object") return [];
  const b = body as Record<string, unknown>;
  const raw = b.projectIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && /^\d+$/.test(x));
}

function parseDesignation(body: unknown): string | null | undefined {
  if (body == null || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  if (!("designation" in b)) return undefined;
  const v = b.designation;
  if (v === null || v === "") return null;
  if (typeof v === "string") return v;
  return null;
}

function parseRoleProfileId(body: unknown): string | null | undefined {
  if (body == null || typeof body !== "object") return undefined;
  const b = body as Record<string, unknown>;
  if (!("roleProfileId" in b)) return undefined;
  const v = b.roleProfileId;
  if (v === null || v === "") return null;
  if (typeof v === "string" && /^\d+$/.test(v)) return v;
  return null;
}

export function createTeamMembersController(pool: Pool, config: AppConfig) {
  return {
    async listPermissions(_req: Request, res: Response): Promise<void> {
      try {
        const { rows } = await pool.query<{ key: string; module: string; description: string }>(
          `SELECT key, module, description FROM public.permissions WHERE is_active = true ORDER BY module, key`
        );
        res.json({ success: true, data: { permissions: rows }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "LIST_PERMISSIONS_FAILED", message: "Could not load permissions." },
        });
      }
    },

    async roleDefaults(req: Request, res: Response): Promise<void> {
      try {
        const raw = String(req.params.role ?? "").trim().toLowerCase();
        const role = (raw === "super_admin" ? "super_admin" : "coordinator") as AppRole;
        if (!["super_admin", "coordinator", "member", "admin"].includes(raw)) {
          res.status(400).json({ success: false, error: { code: "INVALID_ROLE", message: "Invalid role." } });
          return;
        }
        const keys = [...(await defaultPermissionKeysForRole(pool, role))];
        res.json({ success: true, data: { permissionKeys: keys }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "ROLE_DEFAULTS_FAILED", message: "Could not load role defaults." },
        });
      }
    },

    async listProjects(_req: Request, res: Response): Promise<void> {
      try {
        const projects = await listProjectsForPicker(pool);
        res.json({ success: true, data: { projects }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "LIST_PROJECTS_FAILED", message: "Could not load projects." },
        });
      }
    },

    async list(req: Request, res: Response): Promise<void> {
      try {
        const users = await listTeamMembers(pool);
        res.json({ success: true, data: { users }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "TEAM_LIST_FAILED", message: "Could not list team members." },
        });
      }
    },

    async getById(req: Request, res: Response): Promise<void> {
      try {
        const id = String(req.params.id ?? "");
        const user = await getTeamMemberById(pool, id);
        if (!user) {
          res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found." } });
          return;
        }
        res.json({ success: true, data: { user }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "TEAM_GET_FAILED", message: "Could not load user." },
        });
      }
    },

    async create(req: Request, res: Response): Promise<void> {
      const actor = currentUser(req);
      if (!actor) {
        res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } });
        return;
      }
      const body = req.body as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name : "";
      const email = typeof body.email === "string" ? body.email : "";
      const password = typeof body.password === "string" ? body.password : "";
      const wantsSuperAdmin = typeof body.role === "string" && body.role === "super_admin";
      if (wantsSuperAdmin && actor.role !== "super_admin") {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Only super admins can create super administrator accounts." },
        });
        return;
      }
      const role = wantsSuperAdmin ? ("super_admin" as AppRole) : ("coordinator" as AppRole);
      const status = (typeof body.status === "string" ? body.status : "active") as "active" | "invited" | "inactive";
      const roleProfileId = parseRoleProfileId(body);
      const designation = parseDesignation(body);
      const permissionOverrides = parseOverrides(body);
      const desiredPermissionKeys = parseDesiredPermissionKeys(body);
      const projectIds = parseProjectIds(body);
      if (desiredPermissionKeys != null && desiredPermissionKeys.length > 0) {
        const ok = await userHasPermission(pool, actor.id, actor.role, "team_members.assign_permissions");
        if (!ok) {
          res.status(403).json({
            success: false,
            error: { code: "FORBIDDEN", message: "You cannot assign permission overrides." },
          });
          return;
        }
      }
      if (permissionOverrides.length > 0) {
        const ok = await userHasPermission(pool, actor.id, actor.role, "team_members.assign_permissions");
        if (!ok) {
          res.status(403).json({
            success: false,
            error: { code: "FORBIDDEN", message: "You cannot assign permission overrides." },
          });
          return;
        }
      }
      if (projectIds.length > 0) {
        const ok = await userHasPermission(pool, actor.id, actor.role, "team_members.assign_projects");
        if (!ok) {
          res.status(403).json({
            success: false,
            error: { code: "FORBIDDEN", message: "You cannot assign projects." },
          });
          return;
        }
      }
      const result = await createTeamMember(
        pool,
        {
          name,
          email,
          password,
          role,
          designation,
          status,
          roleProfileId: wantsSuperAdmin ? null : roleProfileId ?? null,
          permissionOverrides,
          desiredPermissionKeys:
            desiredPermissionKeys != null && desiredPermissionKeys.length > 0 ? desiredPermissionKeys : null,
          projectIds,
        },
        actor.role,
        actor.id
      );
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      res.status(201).json({ success: true, data: { user: result.user }, message: "User created." });
    },

    async invite(req: Request, res: Response): Promise<void> {
      const actor = currentUser(req);
      if (!actor) {
        res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } });
        return;
      }
      const body = req.body as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name : "";
      const email = typeof body.email === "string" ? body.email : "";
      const wantsSuperAdmin = typeof body.role === "string" && body.role === "super_admin";
      if (wantsSuperAdmin && actor.role !== "super_admin") {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Only super admins can invite super administrator accounts." },
        });
        return;
      }
      const role = wantsSuperAdmin ? ("super_admin" as AppRole) : ("coordinator" as AppRole);
      const roleProfileId = parseRoleProfileId(body);
      const designation = parseDesignation(body);
      const permissionOverrides = parseOverrides(body);
      const desiredPermissionKeys = parseDesiredPermissionKeys(body);
      const projectIds = parseProjectIds(body);
      if (desiredPermissionKeys != null && desiredPermissionKeys.length > 0) {
        const ok = await userHasPermission(pool, actor.id, actor.role, "team_members.assign_permissions");
        if (!ok) {
          res.status(403).json({
            success: false,
            error: { code: "FORBIDDEN", message: "You cannot assign permission overrides." },
          });
          return;
        }
      }
      if (permissionOverrides.length > 0) {
        const ok = await userHasPermission(pool, actor.id, actor.role, "team_members.assign_permissions");
        if (!ok) {
          res.status(403).json({
            success: false,
            error: { code: "FORBIDDEN", message: "You cannot assign permission overrides." },
          });
          return;
        }
      }
      if (projectIds.length > 0) {
        const ok = await userHasPermission(pool, actor.id, actor.role, "team_members.assign_projects");
        if (!ok) {
          res.status(403).json({
            success: false,
            error: { code: "FORBIDDEN", message: "You cannot assign projects." },
          });
          return;
        }
      }
      const result = await inviteTeamMember(
        pool,
        { inviteTtlHours: config.inviteTtlHours, publicAppUrl: config.publicAppUrl },
        {
          name,
          email,
          role,
          designation,
          roleProfileId: wantsSuperAdmin ? null : roleProfileId ?? null,
          permissionOverrides,
          desiredPermissionKeys:
            desiredPermissionKeys != null && desiredPermissionKeys.length > 0 ? desiredPermissionKeys : null,
          projectIds,
        },
        actor.role,
        actor.id
      );
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      const devHint =
        config.nodeEnv !== "production"
          ? { inviteUrl: result.inviteUrl, devToken: result.plainToken }
          : { inviteUrl: result.inviteUrl };
      res.status(201).json({
        success: true,
        data: { user: result.user, ...devHint },
        message: "Invitation created. Share the invite URL with the user (email integration pending).",
      });
    },

    async update(req: Request, res: Response): Promise<void> {
      const actor = currentUser(req);
      if (!actor) {
        res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } });
        return;
      }
      const id = String(req.params.id ?? "");
      const body = req.body as Record<string, unknown>;
      const input: {
        name?: string;
        email?: string;
        role?: AppRole;
        designation?: string | null;
        status?: "active" | "invited" | "inactive";
        roleProfileId?: string | null;
        permissionOverrides?: { key: string; allowed: boolean }[] | null;
        desiredPermissionKeys?: string[] | null;
        projectIds?: string[] | null;
      } = {};
      if (typeof body.name === "string") input.name = body.name;
      if (typeof body.email === "string") input.email = body.email;
      const designation = parseDesignation(body);
      if (designation !== undefined) input.designation = designation;
      if (typeof body.role === "string" && body.role === "super_admin") {
        if (actor.role !== "super_admin") {
          res.status(403).json({
            success: false,
            error: { code: "FORBIDDEN", message: "Only super admins can assign the super_admin role." },
          });
          return;
        }
        input.role = "super_admin";
      }
      if (typeof body.status === "string") input.status = body.status as "active" | "invited" | "inactive";
      const rpid = parseRoleProfileId(body);
      if (rpid !== undefined) input.roleProfileId = rpid;
      if ("desiredPermissionKeys" in body && Array.isArray(body.desiredPermissionKeys)) {
        const desired = parseDesiredPermissionKeys(body);
        if (desired != null && desired.length > 0) {
          const ok = await userHasPermission(pool, actor.id, actor.role, "team_members.assign_permissions");
          if (!ok) {
            res.status(403).json({
              success: false,
              error: { code: "FORBIDDEN", message: "You cannot assign permission overrides." },
            });
            return;
          }
          input.desiredPermissionKeys = desired;
        }
      }
      if ("permissionOverrides" in body && Array.isArray(body.permissionOverrides)) {
        input.permissionOverrides = parseOverrides(body);
        const ok = await userHasPermission(pool, actor.id, actor.role, "team_members.assign_permissions");
        if (!ok) {
          res.status(403).json({
            success: false,
            error: { code: "FORBIDDEN", message: "You cannot assign permission overrides." },
          });
          return;
        }
      }
      if ("projectIds" in body && Array.isArray(body.projectIds)) {
        input.projectIds = parseProjectIds(body);
        const ok = await userHasPermission(pool, actor.id, actor.role, "team_members.assign_projects");
        if (!ok) {
          res.status(403).json({
            success: false,
            error: { code: "FORBIDDEN", message: "You cannot assign projects." },
          });
          return;
        }
      }
      const result = await updateTeamMember(pool, id, input, actor.role, actor.id);
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      res.json({ success: true, data: { user: result.user }, message: "User updated." });
    },

    async deactivate(req: Request, res: Response): Promise<void> {
      const actor = currentUser(req);
      if (!actor) {
        res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized." } });
        return;
      }
      const id = String(req.params.id ?? "");
      const result = await deactivateTeamMember(pool, id, actor.id);
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      res.json({ success: true, data: {}, message: "User deactivated." });
    },
  };
}

export function createAcceptInviteHandler(pool: Pool) {
  return async (req: Request, res: Response): Promise<void> => {
    const body = req.body as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    const result = await acceptInvite(pool, token, password);
    if ("error" in result) {
      res.status(result.error.status).json({
        success: false,
        error: { code: result.error.code, message: result.error.message },
      });
      return;
    }
    res.json({ success: true, data: {}, message: "Account activated. You can sign in now." });
  };
}
