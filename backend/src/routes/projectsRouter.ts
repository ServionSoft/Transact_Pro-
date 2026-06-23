import type { Express } from "express";
import { Router } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { createProjectsController } from "../controllers/projectsController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { requirePool } from "../middleware/storedProject.js";

export function registerProjectsRoutes(app: Express, config: AppConfig, pool: Pool | null): void {
  const router = Router();
  if (!pool) {
    router.get("/projects", requirePool(null));
    app.use("/api", router);
    return;
  }
  const ctrl = createProjectsController(pool, config);
  const auth = requireAuth(config, pool);
  const view = requirePermission(pool, "projects.view");
  const create = requirePermission(pool, "projects.create");
  const edit = requirePermission(pool, "projects.edit");
  const del = requirePermission(pool, "projects.delete");
  const assign = requirePermission(pool, "projects.assign_members");

  router.get("/projects", requirePool(pool), auth, view, (req, res) => {
    void ctrl.list(req, res);
  });
  router.get("/projects/assignment-options", requirePool(pool), auth, assign, (req, res) => {
    void ctrl.listAssignmentOptions(req, res);
  });
  router.get("/nav/badge-counts", requirePool(pool), auth, view, (req, res) => {
    void ctrl.getNavBadgeCounts(req, res);
  });
  router.get("/emails/recent", requirePool(pool), auth, view, (req, res) => {
    void ctrl.listRecentEmails(req, res);
  });
  router.get("/calendar/events", requirePool(pool), auth, view, (req, res) => {
    void ctrl.listCalendarEvents(req, res);
  });
  router.post("/calendar/reminder-drafts/:id/send", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.sendReminderDraft(req, res);
  });
  router.patch("/calendar/reminder-drafts/:id/dismiss", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.dismissReminderDraft(req, res);
  });
  router.get("/projects/:id", requirePool(pool), auth, view, (req, res) => {
    void ctrl.getById(req, res);
  });
  router.post("/projects", requirePool(pool), auth, create, (req, res) => {
    void ctrl.create(req, res);
  });
  router.put("/projects/:id", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.update(req, res);
  });
  router.patch("/projects/:id/stage", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.patchStage(req, res);
  });
  router.patch("/projects/:id/next-step", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.patchNextStep(req, res);
  });
  router.patch("/projects/:id/documents/:documentId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.patchDocumentStatus(req, res);
  });
  router.post("/projects/:id/documents/:documentId/notes", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.createDocumentNote(req, res);
  });
  router.patch("/projects/:id/documents/:documentId/notes/:noteId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.updateDocumentNote(req, res);
  });
  router.delete("/projects/:id/documents/:documentId/notes/:noteId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.deleteDocumentNote(req, res);
  });
  router.post("/projects/:id/documents", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.createDocument(req, res);
  });
  router.delete("/projects/:id/documents/:documentId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.deleteDocument(req, res);
  });
  router.delete("/projects/:id", requirePool(pool), auth, del, (req, res) => {
    void ctrl.delete(req, res);
  });
  router.post("/projects/:id/restore", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.restore(req, res);
  });
  router.delete("/projects/:id/permanent", requirePool(pool), auth, del, (req, res) => {
    void ctrl.permanentDelete(req, res);
  });
  router.post("/projects/:id/tasks", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.createTask(req, res);
  });
  router.patch("/projects/:id/tasks/:taskId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.patchTask(req, res);
  });
  router.delete("/projects/:id/tasks/:taskId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.deleteTask(req, res);
  });
  router.patch("/projects/:id/tasks/bulk", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.patchTasksBulkStatus(req, res);
  });
  router.post("/projects/:id/tasks/:taskId/notes", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.createTaskNote(req, res);
  });
  router.patch("/projects/:id/tasks/:taskId/notes/:noteId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.updateTaskNote(req, res);
  });
  router.delete("/projects/:id/tasks/:taskId/notes/:noteId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.deleteTaskNote(req, res);
  });
  router.post("/projects/:id/deadlines", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.createDeadline(req, res);
  });
  router.patch("/projects/:id/deadlines/:deadlineId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.patchDeadline(req, res);
  });
  router.patch("/projects/:id/timeline-fields/:fieldKey", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.patchTimelineField(req, res);
  });
  router.patch("/projects/:id/custom-timeline", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.patchCustomTimeline(req, res);
  });
  router.delete("/projects/:id/deadlines/:deadlineId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.deleteDeadline(req, res);
  });
  router.post("/projects/:id/reminder-drafts", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.createReminderDraft(req, res);
  });
  router.post("/projects/:id/emails", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.createEmail(req, res);
  });
  router.delete("/projects/:id/emails/:emailId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.deleteEmail(req, res);
  });
  router.post("/projects/:id/notes", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.createNote(req, res);
  });
  router.patch("/projects/:id/notes/:noteId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.updateNote(req, res);
  });
  router.delete("/projects/:id/notes/:noteId", requirePool(pool), auth, edit, (req, res) => {
    void ctrl.deleteNote(req, res);
  });
  router.put("/projects/:id/assignments", requirePool(pool), auth, assign, (req, res) => {
    void ctrl.setAssignments(req, res);
  });

  app.use("/api", router);
}
