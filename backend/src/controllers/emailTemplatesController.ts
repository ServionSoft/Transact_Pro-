import type { Request, Response } from "express";
import type { Pool } from "pg";
import { currentUser } from "../middleware/auth.js";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  updateEmailTemplate,
  type EmailTemplateUpsertInput,
} from "../services/emailTemplatesService.js";

function parseBody(body: unknown): EmailTemplateUpsertInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  return {
    name: typeof b.name === "string" ? b.name : "",
    category: typeof b.category === "string" ? b.category : "",
    subject: typeof b.subject === "string" ? b.subject : "",
    body: typeof b.body === "string" ? b.body : "",
    ...(typeof b.isActive === "boolean" ? { isActive: b.isActive } : {}),
  };
}

export function createEmailTemplatesController(pool: Pool) {
  return {
    async list(_req: Request, res: Response): Promise<void> {
      try {
        const templates = await listEmailTemplates(pool);
        res.json({ success: true, data: { templates }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "EMAIL_TEMPLATES_LIST_FAILED", message: "Could not load email templates." },
        });
      }
    },

    async create(req: Request, res: Response): Promise<void> {
      const input = parseBody(req.body);
      if (!input) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Invalid request body." },
        });
        return;
      }
      const result = await createEmailTemplate(pool, input, currentUser(req)?.id ?? null);
      if ("error" in result) {
        const e = result.error;
        res.status(e.status).json({ success: false, error: { code: e.code, message: e.message } });
        return;
      }
      res.status(201).json({ success: true, data: { template: result.template }, message: "" });
    },

    async update(req: Request, res: Response): Promise<void> {
      const input = parseBody(req.body);
      if (!input) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Invalid request body." },
        });
        return;
      }
      const result = await updateEmailTemplate(pool, req.params.id, input);
      if ("error" in result) {
        const e = result.error;
        res.status(e.status).json({ success: false, error: { code: e.code, message: e.message } });
        return;
      }
      res.json({ success: true, data: { template: result.template }, message: "" });
    },

    async remove(req: Request, res: Response): Promise<void> {
      const result = await deleteEmailTemplate(pool, req.params.id);
      if ("error" in result) {
        const e = result.error;
        res.status(e.status).json({ success: false, error: { code: e.code, message: e.message } });
        return;
      }
      res.json({ success: true, data: {}, message: "Template deleted." });
    },
  };
}

