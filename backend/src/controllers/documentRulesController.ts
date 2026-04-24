import type { Request, Response } from "express";
import type { Pool } from "pg";
import {
  createDocumentRule,
  deleteDocumentRule,
  getHydratedDocumentRuleById,
  listHydratedDocumentRules,
  patchDocumentRuleIsActive,
  updateDocumentRule,
  type UpsertDocumentRuleInput,
} from "../services/documentRulesService.js";

function parseUpsertBody(body: unknown): UpsertDocumentRuleInput | null {
  if (body == null || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name : "";
  const kind = b.kind === "standard" || b.kind === "conditional" ? b.kind : null;
  const triggers = Array.isArray(b.triggers) ? (b.triggers as { field: string; value: string }[]) : null;
  const documents = Array.isArray(b.documents) ? (b.documents as UpsertDocumentRuleInput["documents"]) : [];
  const actions = Array.isArray(b.actions) ? (b.actions as UpsertDocumentRuleInput["actions"]) : [];
  const isActive = typeof b.isActive === "boolean" ? b.isActive : true;
  if (!kind || !triggers) return null;
  return { name, kind, triggers, documents, actions, isActive };
}

export function createDocumentRulesController(pool: Pool) {
  return {
    async list(_req: Request, res: Response): Promise<void> {
      try {
        const rules = await listHydratedDocumentRules(pool);
        res.json({ success: true, data: { rules }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: {
            code: "DOCUMENT_RULES_LIST_FAILED",
            message: "Could not load document rules.",
          },
        });
      }
    },

    async create(req: Request, res: Response): Promise<void> {
      const input = parseUpsertBody(req.body);
      if (!input) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Invalid request body." },
        });
        return;
      }
      const result = await createDocumentRule(pool, input);
      if ("error" in result) {
        const e = result.error;
        res.status(e.status).json({
          success: false,
          error: { code: e.code, message: e.message },
        });
        return;
      }
      res.status(201).json({ success: true, data: { rule: result.rule }, message: "" });
    },

    async update(req: Request, res: Response): Promise<void> {
      const id = req.params.id;
      const input = parseUpsertBody(req.body);
      if (!input) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Invalid request body." },
        });
        return;
      }
      const result = await updateDocumentRule(pool, id, input);
      if ("error" in result) {
        const e = result.error;
        res.status(e.status).json({
          success: false,
          error: { code: e.code, message: e.message },
        });
        return;
      }
      res.json({ success: true, data: { rule: result.rule }, message: "" });
    },

    async patchActive(req: Request, res: Response): Promise<void> {
      const id = req.params.id;
      const body = req.body;
      if (body == null || typeof body !== "object" || typeof (body as { isActive?: unknown }).isActive !== "boolean") {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Body must include boolean isActive." },
        });
        return;
      }
      const result = await patchDocumentRuleIsActive(pool, id, (body as { isActive: boolean }).isActive);
      if ("error" in result) {
        const e = result.error;
        res.status(e.status).json({
          success: false,
          error: { code: e.code, message: e.message },
        });
        return;
      }
      res.json({ success: true, data: { rule: result.rule }, message: "" });
    },

    async remove(req: Request, res: Response): Promise<void> {
      const id = req.params.id;
      const result = await deleteDocumentRule(pool, id);
      if ("error" in result) {
        const e = result.error;
        res.status(e.status).json({
          success: false,
          error: { code: e.code, message: e.message },
        });
        return;
      }
      res.json({ success: true, data: {}, message: "Rule deleted." });
    },

    async getById(req: Request, res: Response): Promise<void> {
      const id = req.params.id;
      try {
        const rule = await getHydratedDocumentRuleById(pool, id);
        if (!rule) {
          res.status(404).json({
            success: false,
            error: { code: "RULE_NOT_FOUND", message: "Rule not found." },
          });
          return;
        }
        res.json({ success: true, data: { rule }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "DOCUMENT_RULE_LOAD_FAILED", message: "Could not load rule." },
        });
      }
    },
  };
}
