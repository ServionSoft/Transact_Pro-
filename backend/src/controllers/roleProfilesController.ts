import type { Request, Response } from "express";
import type { Pool } from "pg";
import {
  createRoleProfile,
  deleteRoleProfile,
  getRoleProfileById,
  listRoleProfiles,
  updateRoleProfile,
} from "../services/roleProfilesService.js";

function parseKeys(body: unknown): string[] | undefined {
  if (body == null || typeof body !== "object") return undefined;
  const raw = (body as Record<string, unknown>).permissionKeys;
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function parseDefaultDesignation(body: unknown): string | null | undefined {
  if (body == null || typeof body !== "object") return undefined;
  const raw = (body as Record<string, unknown>).defaultDesignation;
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  return String(raw);
}

export function createRoleProfilesController(pool: Pool) {
  return {
    async list(_req: Request, res: Response): Promise<void> {
      try {
        const profiles = await listRoleProfiles(pool);
        res.json({ success: true, data: { profiles }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "LIST_FAILED", message: "Could not list role profiles." },
        });
      }
    },

    async getById(req: Request, res: Response): Promise<void> {
      try {
        const id = String(req.params.id ?? "");
        const profile = await getRoleProfileById(pool, id);
        if (!profile) {
          res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Role profile not found." } });
          return;
        }
        res.json({ success: true, data: { profile }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "GET_FAILED", message: "Could not load role profile." },
        });
      }
    },

    async create(req: Request, res: Response): Promise<void> {
      const body = req.body as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name : "";
      const description = typeof body.description === "string" ? body.description : null;
      const defaultDesignation = parseDefaultDesignation(req.body);
      const permissionKeys = parseKeys(req.body) ?? [];
      const result = await createRoleProfile(pool, {
        name,
        description: description === null ? null : description,
        defaultDesignation,
        permissionKeys,
      });
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      res.status(201).json({ success: true, data: { profile: result.profile }, message: "Role profile created." });
    },

    async update(req: Request, res: Response): Promise<void> {
      const id = String(req.params.id ?? "");
      const body = req.body as Record<string, unknown>;
      const input: { name?: string; description?: string | null; defaultDesignation?: string | null; permissionKeys?: string[] } = {};
      if (typeof body.name === "string") input.name = body.name;
      if ("description" in body) {
        input.description = body.description === null || body.description === undefined ? null : String(body.description);
      }
      const defaultDesignation = parseDefaultDesignation(req.body);
      if (defaultDesignation !== undefined) input.defaultDesignation = defaultDesignation;
      const keys = parseKeys(req.body);
      if (keys !== undefined) input.permissionKeys = keys;
      const result = await updateRoleProfile(pool, id, input);
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      res.json({ success: true, data: { profile: result.profile }, message: "Role profile updated." });
    },

    async remove(req: Request, res: Response): Promise<void> {
      const id = String(req.params.id ?? "");
      const result = await deleteRoleProfile(pool, id);
      if ("error" in result) {
        res.status(result.error.status).json({
          success: false,
          error: { code: result.error.code, message: result.error.message },
        });
        return;
      }
      res.json({ success: true, data: {}, message: "Role profile removed." });
    },
  };
}
