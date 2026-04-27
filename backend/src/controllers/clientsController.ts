import type { Request, Response } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import {
  archiveClient,
  createClient,
  getClientById,
  listClients,
  permanentlyDeleteClient,
  updateClient,
  type ClientUpsertInput,
} from "../services/clientsService.js";

function parseClientBody(body: unknown): ClientUpsertInput | null {
  if (body == null || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  return {
    name: typeof b.name === "string" ? b.name : "",
    email: typeof b.email === "string" ? b.email : "",
    phone: typeof b.phone === "string" ? b.phone : "",
    company: typeof b.company === "string" ? b.company : "",
    role: typeof b.role === "string" ? b.role : "",
    status: typeof b.status === "string" ? b.status : "",
    propertyAddress: typeof b.propertyAddress === "string" ? b.propertyAddress : "",
    city: typeof b.city === "string" ? b.city : "",
    state: typeof b.state === "string" ? b.state : "",
    zip: typeof b.zip === "string" ? b.zip : "",
    notes: typeof b.notes === "string" ? b.notes : "",
  };
}

export function createClientsController(pool: Pool, config: AppConfig) {
  return {
    async list(_req: Request, res: Response): Promise<void> {
      try {
        const clients = await listClients(pool);
        res.json({ success: true, data: { clients }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "CLIENT_LIST_FAILED", message: "Could not load clients." },
        });
      }
    },

    async getById(req: Request, res: Response): Promise<void> {
      try {
        const client = await getClientById(pool, req.params.id);
        if (!client) {
          res.status(404).json({
            success: false,
            error: { code: "CLIENT_NOT_FOUND", message: "Client not found." },
          });
          return;
        }
        res.json({ success: true, data: { client }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "CLIENT_LOAD_FAILED", message: "Could not load client." },
        });
      }
    },

    async create(req: Request, res: Response): Promise<void> {
      const input = parseClientBody(req.body);
      if (!input) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Invalid request body." },
        });
        return;
      }
      try {
        const result = await createClient(pool, input, config.defaultUploadUserId);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.status(201).json({ success: true, data: { client: result.client }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "CLIENT_CREATE_FAILED", message: "Could not create client." },
        });
      }
    },

    async update(req: Request, res: Response): Promise<void> {
      const input = parseClientBody(req.body);
      if (!input) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Invalid request body." },
        });
        return;
      }
      try {
        const result = await updateClient(pool, req.params.id, input);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: { client: result.client }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "CLIENT_UPDATE_FAILED", message: "Could not update client." },
        });
      }
    },

    async archive(req: Request, res: Response): Promise<void> {
      try {
        const result = await archiveClient(pool, req.params.id);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: {}, message: "Client archived." });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "CLIENT_ARCHIVE_FAILED", message: "Could not archive client." },
        });
      }
    },

    async permanentDelete(req: Request, res: Response): Promise<void> {
      try {
        const result = await permanentlyDeleteClient(pool, req.params.id);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: {}, message: "Client permanently deleted." });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "CLIENT_DELETE_FAILED", message: "Could not delete client." },
        });
      }
    },
  };
}
