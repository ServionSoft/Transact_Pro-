import type { Request, Response } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import {
  listAssignableProjectUsers,
  createProjectDocumentNote,
  createProjectNote,
  createProjectDeadline,
  createReminderDraft,
  createProjectDocument,
  createProjectEmail,
  dismissReminderDraft as dismissReminderDraftService,
  deleteProjectEmail,
  listCalendarEvents,
  listRecentProjectEmails,
  sendReminderDraft as sendReminderDraftService,
  createProjectTask,
  createProject,
  deleteProject,
  deleteProjectDocument,
  getProjectById,
  listProjects,
  patchProjectDocumentStatus,
  patchProjectNextStep,
  patchProjectTaskStatus,
  patchProjectTasksBulkStatus,
  setProjectAssignments,
  patchProjectStage,
  updateProject,
  type DocumentStatusUi,
  type ProjectCreateInput,
} from "../services/projectsService.js";
import { currentUser } from "../middleware/auth.js";

function parseCreateBody(body: unknown): ProjectCreateInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const docsRaw = Array.isArray(b.documents) ? b.documents : [];
  const documents = docsRaw
    .filter((d) => d && typeof d === "object")
    .map((d) => {
      const x = d as Record<string, unknown>;
      return {
        name: typeof x.name === "string" ? x.name : "",
        status: typeof x.status === "string" ? (x.status as DocumentStatusUi) : undefined,
        customStatus: typeof x.customStatus === "string" ? x.customStatus : undefined,
        required: typeof x.required === "boolean" ? x.required : undefined,
        sourceRuleId: typeof x.sourceRuleId === "string" ? x.sourceRuleId : undefined,
        sourceRuleActionId: typeof x.sourceRuleActionId === "string" ? x.sourceRuleActionId : undefined,
        esignDocumentId: typeof x.esignDocumentId === "string" ? x.esignDocumentId : undefined,
        attachedFileIds: Array.isArray(x.attachedFileIds)
          ? x.attachedFileIds.filter((id): id is string => typeof id === "string")
          : undefined,
      };
    });
  return {
    name: typeof b.name === "string" ? b.name : "",
    clientId: typeof b.clientId === "string" ? b.clientId : "",
    propertyAddress: typeof b.propertyAddress === "string" ? b.propertyAddress : "",
    type: typeof b.type === "string" ? (b.type as "Listing" | "Buyer File") : "Listing",
    stage: typeof b.stage === "string" ? (b.stage as never) : undefined,
    nextStep: typeof b.nextStep === "string" ? b.nextStep : "",
    nextStepDate: typeof b.nextStepDate === "string" ? b.nextStepDate : "",
    yearBuilt: typeof b.yearBuilt === "string" ? b.yearBuilt : "",
    propertyType: typeof b.propertyType === "string" ? b.propertyType : "",
    representationSide: typeof b.representationSide === "string" ? b.representationSide : "",
    escrowOfficer: typeof b.escrowOfficer === "string" ? b.escrowOfficer : "",
    escrowCompany: typeof b.escrowCompany === "string" ? b.escrowCompany : "",
    listPrice: typeof b.listPrice === "string" ? b.listPrice : "",
    city: typeof b.city === "string" ? b.city : "",
    state: typeof b.state === "string" ? b.state : "",
    zip: typeof b.zip === "string" ? b.zip : "",
    documents,
    metadata:
      b.metadata && typeof b.metadata === "object" && !Array.isArray(b.metadata)
        ? (b.metadata as Record<string, unknown>)
        : undefined,
  };
}

export function createProjectsController(pool: Pool, config: AppConfig) {
  return {
    async list(req: Request, res: Response): Promise<void> {
      try {
        const search = typeof req.query.search === "string" ? req.query.search : "";
        const stage = typeof req.query.stage === "string" ? req.query.stage : "";
        const archived = String(req.query.archived ?? "").toLowerCase() === "true";
        const clientId = typeof req.query.clientId === "string" ? req.query.clientId.trim() : "";
        const projects = await listProjects(pool, {
          search,
          stage,
          archived,
          excludeProjectId: config.crmVaultProjectId,
          ...(clientId ? { clientId } : {}),
        });
        res.json({ success: true, data: { projects }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "PROJECT_LIST_FAILED", message: "Could not load projects." },
        });
      }
    },

    async listRecentEmails(req: Request, res: Response): Promise<void> {
      try {
        const user = currentUser(req);
        if (!user) {
          res.status(401).json({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Authentication required." },
          });
          return;
        }
        const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 25;
        const emails = await listRecentProjectEmails(pool, config, { user, limit: limitRaw });
        res.json({ success: true, data: { emails }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "RECENT_EMAILS_FAILED", message: "Could not load recent emails." },
        });
      }
    },

    async listCalendarEvents(req: Request, res: Response): Promise<void> {
      try {
        const user = currentUser(req);
        if (!user) {
          res.status(401).json({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Authentication required." },
          });
          return;
        }
        const from = typeof req.query.from === "string" ? req.query.from : "";
        const to = typeof req.query.to === "string" ? req.query.to : "";
        const projectId = typeof req.query.projectId === "string" ? req.query.projectId : "";
        const kinds =
          typeof req.query.kinds === "string"
            ? req.query.kinds
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean)
            : [];
        const events = await listCalendarEvents(pool, { user, from, to, projectId, kinds });
        res.json({ success: true, data: { events }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "CALENDAR_EVENTS_FAILED", message: "Could not load calendar events." },
        });
      }
    },

    async sendReminderDraft(req: Request, res: Response): Promise<void> {
      try {
        const user = currentUser(req);
        const result = await sendReminderDraftService(pool, config, req.params.id, user?.id ?? null);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: { sent: true }, message: "Reminder sent." });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "REMINDER_SEND_FAILED", message: "Could not send reminder." },
        });
      }
    },

    async dismissReminderDraft(req: Request, res: Response): Promise<void> {
      try {
        const result = await dismissReminderDraftService(pool, req.params.id);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: { dismissed: true }, message: "Reminder dismissed." });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "REMINDER_DISMISS_FAILED", message: "Could not dismiss reminder." },
        });
      }
    },

    async getById(req: Request, res: Response): Promise<void> {
      try {
        const project = await getProjectById(pool, req.params.id);
        if (!project) {
          res.status(404).json({
            success: false,
            error: { code: "PROJECT_NOT_FOUND", message: "Project not found." },
          });
          return;
        }
        res.json({ success: true, data: { project }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "PROJECT_LOAD_FAILED", message: "Could not load project." },
        });
      }
    },

    async create(req: Request, res: Response): Promise<void> {
      const input = parseCreateBody(req.body);
      if (!input) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Invalid request body." },
        });
        return;
      }
      try {
        const user = currentUser(req);
        const result = await createProject(pool, input, user?.id ?? null);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.status(201).json({ success: true, data: { project: result.project }, message: "" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not create project.";
        console.error("[projects] create failed:", err);
        res.status(500).json({
          success: false,
          error: { code: "PROJECT_CREATE_FAILED", message },
        });
      }
    },

    async update(req: Request, res: Response): Promise<void> {
      const input = parseCreateBody(req.body);
      if (!input) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_BODY", message: "Invalid request body." },
        });
        return;
      }
      try {
        const result = await updateProject(pool, req.params.id, input);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: { project: result.project }, message: "" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not update project.";
        console.error("[projects] update failed:", err);
        res.status(500).json({
          success: false,
          error: { code: "PROJECT_UPDATE_FAILED", message },
        });
      }
    },

    async patchStage(req: Request, res: Response): Promise<void> {
      const stage = typeof (req.body as { stage?: unknown })?.stage === "string" ? String((req.body as { stage: string }).stage) : "";
      try {
        const result = await patchProjectStage(pool, req.params.id, stage);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "PROJECT_STAGE_UPDATE_FAILED", message: "Could not update project stage." },
        });
      }
    },

    async patchNextStep(req: Request, res: Response): Promise<void> {
      const body = req.body as { nextStep?: unknown; nextStepDate?: unknown };
      const nextStep = typeof body?.nextStep === "string" ? body.nextStep : "";
      const nextStepDate = typeof body?.nextStepDate === "string" ? body.nextStepDate : "";
      try {
        const result = await patchProjectNextStep(pool, req.params.id, nextStep, nextStepDate);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "PROJECT_NEXT_STEP_UPDATE_FAILED", message: "Could not update next step." },
        });
      }
    },

    async patchDocumentStatus(req: Request, res: Response): Promise<void> {
      const body = req.body as { status?: unknown; customStatus?: unknown };
      const status = typeof body?.status === "string" ? body.status : "";
      const customStatus = typeof body?.customStatus === "string" ? body.customStatus : "";
      try {
        const result = await patchProjectDocumentStatus(pool, req.params.id, req.params.documentId, status, customStatus);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "PROJECT_DOCUMENT_STATUS_UPDATE_FAILED", message: "Could not update document status." },
        });
      }
    },

    async createDocument(req: Request, res: Response): Promise<void> {
      const body = req.body as { name?: unknown };
      const name = typeof body?.name === "string" ? body.name : "";
      try {
        const user = currentUser(req);
        const result = await createProjectDocument(pool, req.params.id, name, user?.id ?? null);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.status(201).json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "PROJECT_DOCUMENT_CREATE_FAILED", message: "Could not create project document." },
        });
      }
    },

    async deleteDocument(req: Request, res: Response): Promise<void> {
      try {
        const result = await deleteProjectDocument(pool, req.params.id, req.params.documentId);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "PROJECT_DOCUMENT_DELETE_FAILED", message: "Could not delete project document." },
        });
      }
    },

    async delete(req: Request, res: Response): Promise<void> {
      try {
        const result = await deleteProject(pool, req.params.id);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: {}, message: "Project deleted." });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "PROJECT_DELETE_FAILED", message: "Could not delete project." },
        });
      }
    },

    async createTask(req: Request, res: Response): Promise<void> {
      const body = req.body as { title?: unknown; stage?: unknown; status?: unknown; dueDate?: unknown };
      const title = typeof body?.title === "string" ? body.title : "";
      const stage = typeof body?.stage === "string" ? body.stage : "";
      const status = typeof body?.status === "string" ? body.status : "";
      const dueDate = typeof body?.dueDate === "string" ? body.dueDate : "";
      try {
        const result = await createProjectTask(pool, req.params.id, { title, stage, status, dueDate });
        if ("error" in result) {
          res.status(result.error.status).json({ success: false, error: { code: result.error.code, message: result.error.message } });
          return;
        }
        res.status(201).json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({ success: false, error: { code: "PROJECT_TASK_CREATE_FAILED", message: "Could not create project task." } });
      }
    },

    async patchTaskStatus(req: Request, res: Response): Promise<void> {
      const body = req.body as { status?: unknown };
      const status = typeof body?.status === "string" ? body.status : "";
      try {
        const result = await patchProjectTaskStatus(pool, req.params.id, req.params.taskId, status);
        if ("error" in result) {
          res.status(result.error.status).json({ success: false, error: { code: result.error.code, message: result.error.message } });
          return;
        }
        res.json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({ success: false, error: { code: "PROJECT_TASK_STATUS_UPDATE_FAILED", message: "Could not update project task." } });
      }
    },

    async patchTasksBulkStatus(req: Request, res: Response): Promise<void> {
      const body = req.body as { status?: unknown; taskIds?: unknown };
      const status = typeof body?.status === "string" ? body.status : "";
      const taskIds = Array.isArray(body?.taskIds) ? body.taskIds.filter((v): v is string => typeof v === "string") : [];
      try {
        const result = await patchProjectTasksBulkStatus(pool, req.params.id, taskIds, status);
        if ("error" in result) {
          res.status(result.error.status).json({ success: false, error: { code: result.error.code, message: result.error.message } });
          return;
        }
        res.json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({ success: false, error: { code: "PROJECT_TASK_BULK_STATUS_UPDATE_FAILED", message: "Could not update project tasks." } });
      }
    },

    async createDeadline(req: Request, res: Response): Promise<void> {
      const body = req.body as { title?: unknown; date?: unknown; type?: unknown };
      const title = typeof body?.title === "string" ? body.title : "";
      const date = typeof body?.date === "string" ? body.date : "";
      const type = typeof body?.type === "string" ? body.type : "";
      try {
        const result = await createProjectDeadline(pool, req.params.id, { title, date, type });
        if ("error" in result) {
          res.status(result.error.status).json({ success: false, error: { code: result.error.code, message: result.error.message } });
          return;
        }
        res.status(201).json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({ success: false, error: { code: "PROJECT_DEADLINE_CREATE_FAILED", message: "Could not create project deadline." } });
      }
    },

    async createReminderDraft(req: Request, res: Response): Promise<void> {
      const body = req.body as {
        projectDeadlineId?: unknown;
        reminderType?: unknown;
        subject?: unknown;
        body?: unknown;
        to?: unknown;
      };
      const projectDeadlineId = typeof body?.projectDeadlineId === "string" ? body.projectDeadlineId : "";
      const reminderType = typeof body?.reminderType === "string" ? body.reminderType : "";
      const subject = typeof body?.subject === "string" ? body.subject : "";
      const draftBody = typeof body?.body === "string" ? body.body : "";
      const to = typeof body?.to === "string" ? body.to : "";
      try {
        const result = await createReminderDraft(pool, req.params.id, {
          projectDeadlineId,
          reminderType,
          subject,
          body: draftBody,
          to,
        });
        if ("error" in result) {
          res.status(result.error.status).json({ success: false, error: { code: result.error.code, message: result.error.message } });
          return;
        }
        res.status(201).json({ success: true, data: { reminderDraftId: result.id }, message: "Reminder draft saved." });
      } catch {
        res.status(500).json({ success: false, error: { code: "REMINDER_DRAFT_CREATE_FAILED", message: "Could not save reminder draft." } });
      }
    },

    async createEmail(req: Request, res: Response): Promise<void> {
      const body = req.body as { to?: unknown; subject?: unknown; body?: unknown; from?: unknown; templateId?: unknown };
      const to = typeof body?.to === "string" ? body.to : "";
      const subject = typeof body?.subject === "string" ? body.subject : "";
      const emailBody = typeof body?.body === "string" ? body.body : "";
      const from = typeof body?.from === "string" ? body.from : "";
      const templateId = typeof body?.templateId === "string" ? body.templateId : "";
      try {
        const user = currentUser(req);
        const result = await createProjectEmail(
          pool,
          config,
          req.params.id,
          { to, subject, body: emailBody, from, templateId },
          user?.id ?? null
        );
        if ("error" in result) {
          res.status(result.error.status).json({ success: false, error: { code: result.error.code, message: result.error.message } });
          return;
        }
        const msg =
          result.emailSendFailed === true
            ? "Email saved; SMTP delivery failed. Check the Communications thread for details."
            : "Email sent.";
        res.status(201).json({
          success: true,
          data: {
            project: result.project,
            ...(result.emailSendFailed ? { emailSendFailed: true, emailSendError: result.emailSendError } : {}),
          },
          message: msg,
        });
      } catch {
        res.status(500).json({ success: false, error: { code: "PROJECT_EMAIL_CREATE_FAILED", message: "Could not send project email." } });
      }
    },

    async deleteEmail(req: Request, res: Response): Promise<void> {
      try {
        const result = await deleteProjectEmail(pool, req.params.id, req.params.emailId);
        if ("error" in result) {
          res.status(result.error.status).json({
            success: false,
            error: { code: result.error.code, message: result.error.message },
          });
          return;
        }
        res.json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({
          success: false,
          error: { code: "PROJECT_EMAIL_DELETE_FAILED", message: "Could not delete project email." },
        });
      }
    },

    async createNote(req: Request, res: Response): Promise<void> {
      const body = req.body as { body?: unknown };
      const noteBody = typeof body?.body === "string" ? body.body : "";
      try {
        const user = currentUser(req);
        const result = await createProjectNote(pool, req.params.id, noteBody, user?.id ?? null);
        if ("error" in result) {
          res.status(result.error.status).json({ success: false, error: { code: result.error.code, message: result.error.message } });
          return;
        }
        res.status(201).json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({ success: false, error: { code: "PROJECT_NOTE_CREATE_FAILED", message: "Could not create project note." } });
      }
    },

    async createDocumentNote(req: Request, res: Response): Promise<void> {
      const body = req.body as { body?: unknown };
      const noteBody = typeof body?.body === "string" ? body.body : "";
      try {
        const user = currentUser(req);
        const result = await createProjectDocumentNote(pool, req.params.id, req.params.documentId, noteBody, user?.id ?? null);
        if ("error" in result) {
          res.status(result.error.status).json({ success: false, error: { code: result.error.code, message: result.error.message } });
          return;
        }
        res.status(201).json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({ success: false, error: { code: "PROJECT_DOCUMENT_NOTE_CREATE_FAILED", message: "Could not create document note." } });
      }
    },

    async listAssignmentOptions(_req: Request, res: Response): Promise<void> {
      try {
        const users = await listAssignableProjectUsers(pool);
        res.json({ success: true, data: { users }, message: "" });
      } catch {
        res.status(500).json({ success: false, error: { code: "PROJECT_ASSIGNMENT_OPTIONS_FAILED", message: "Could not load assignable users." } });
      }
    },

    async setAssignments(req: Request, res: Response): Promise<void> {
      const body = req.body as { userIds?: unknown };
      const userIds = Array.isArray(body?.userIds) ? body.userIds.filter((v): v is string => typeof v === "string") : [];
      try {
        const user = currentUser(req);
        const result = await setProjectAssignments(pool, req.params.id, userIds, user?.id ?? null);
        if ("error" in result) {
          res.status(result.error.status).json({ success: false, error: { code: result.error.code, message: result.error.message } });
          return;
        }
        res.json({ success: true, data: { project: result.project }, message: "" });
      } catch {
        res.status(500).json({ success: false, error: { code: "PROJECT_ASSIGNMENT_UPDATE_FAILED", message: "Could not update project assignments." } });
      }
    },
  };
}
