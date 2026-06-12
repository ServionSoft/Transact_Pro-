// Session-only in-memory store backed by Zustand. Hydrated from the API per page;
// no sample transactions/contacts are seeded at startup.

import { create } from "zustand";
import {
  createCrmDocumentVaultProject,
  CRM_DOCUMENT_VAULT_PROJECT_ID,
  type Client,
  type Project,
  type ProjectStage,
  type ProjectTask,
  type CalendarEvent,
  type ReminderDraft,
  type EmailTemplate,
  type EmailThread,
  type ProjectDocument,
  type TaskStatus,
  type DocumentStatus,
  type FileAttachment,
  type ProjectFolder,
} from "@/types/domain";

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function notifyNavBadgeRefresh(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("transactpro:refresh-nav-badges"));
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const defaultFileFolders = (): ProjectFolder[] => [];

const docUploadedSnapshot = (attachments: FileAttachment[], attachedFileIds: string[]) => {
  if (!attachedFileIds.length) return undefined;
  const first = attachments.find((a) => a.id === attachedFileIds[0]);
  return first?.name;
};

interface SentEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  projectId?: string;
}

interface AppState {
  clients: Client[];
  projects: Project[];
  calendarEvents: CalendarEvent[];
  reminderDrafts: ReminderDraft[];
  emailTemplates: EmailTemplate[];
  sentEmails: SentEmail[];

  // ---- Clients ----
  setClients: (clients: Client[]) => void;
  upsertClient: (client: Client) => void;
  removeClientFromList: (id: string) => void;
  addClient: (input: Omit<Client, "id" | "createdAt" | "projectCount">) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // ---- Projects ----
  setProjects: (projects: Project[]) => void;
  upsertProject: (project: Project) => void;
  addProject: (input: Omit<Project, "id" | "createdAt" | "documents" | "tasks" | "emails" | "deadlines" | "attachments" | "fileFolders"> & {
    documents?: ProjectDocument[];
    tasks?: ProjectTask[];
    deadlines?: Project["deadlines"];
    fileFolders?: ProjectFolder[];
  }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setProjectStage: (id: string, stage: ProjectStage) => void;
  setNextStep: (id: string, nextStep: string, nextStepDate: string) => void;

  // ---- Documents on a project ----
  setDocStatus: (projectId: string, docId: string, status: DocumentStatus, customStatus?: string) => void;
  addProjectDocument: (projectId: string, name: string) => void;
  bulkSetDocStatus: (projectId: string, docIds: string[], status: DocumentStatus) => void;

  // ---- Stored file pool + checklist links ----
  addStoredFileToPool: (projectId: string, file: File, folderId: string | null, uploadedBy: string) => void;
  /** Replace pool + folders from GET; drops checklist links to ids that no longer exist */
  hydrateProjectFilePool: (
    projectId: string,
    payload: { attachments: FileAttachment[]; fileFolders?: ProjectFolder[] }
  ) => void;
  appendProjectAttachments: (projectId: string, files: FileAttachment[]) => void;
  /** Returns `"ok"` | `"linked"` | `"missing"` */
  deleteStoredFile: (projectId: string, fileId: string) => "ok" | "linked" | "missing";
  moveStoredFileToFolder: (projectId: string, fileId: string, folderId: string | null) => void;
  renameStoredFileInPool: (projectId: string, fileId: string, name: string) => void;
  addProjectFileFolder: (projectId: string, name: string, parentId: string | null) => void;
  removeProjectFileFolder: (projectId: string, folderId: string) => void;
  attachStoredFilesToDocument: (projectId: string, docId: string, fileIds: string[]) => void;
  detachStoredFileFromDocument: (projectId: string, docId: string, fileId: string) => void;
  uploadFileToDocument: (projectId: string, docId: string, file: File, uploadedBy: string) => void;

  // ---- Tasks ----
  addProjectTask: (projectId: string, task: Omit<ProjectTask, "id">) => void;
  setTaskStatus: (projectId: string, taskId: string, status: TaskStatus) => void;
  updateProjectTask: (
    projectId: string,
    taskId: string,
    patch: Partial<Pick<ProjectTask, "title" | "stage" | "status" | "dueDate">>
  ) => void;
  deleteProjectTask: (projectId: string, taskId: string) => void;
  addProjectTaskNote: (
    projectId: string,
    taskId: string,
    note: { id: string; date: string; text: string; author: string; updatedAt?: string }
  ) => void;
  updateProjectTaskNote: (projectId: string, taskId: string, noteId: string, text: string) => void;
  deleteProjectTaskNote: (projectId: string, taskId: string, noteId: string) => void;

  // ---- Calendar / deadlines ----
  addCalendarEvent: (e: Omit<CalendarEvent, "id">) => void;
  addProjectDeadline: (projectId: string, title: string, date: string, type: "deadline" | "reminder") => void;
  updateProjectNote: (projectId: string, noteId: string, body: string) => void;
  deleteProjectNote: (projectId: string, noteId: string) => void;
  updateProjectDeadlineDate: (projectId: string, deadlineId: string, date: string) => void;
  deleteProjectDeadline: (projectId: string, deadlineId: string) => void;

  // ---- Reminders ----
  dismissReminder: (id: string) => void;
  sendReminder: (id: string) => void;

  // ---- Email ----
  setEmailTemplates: (templates: EmailTemplate[]) => void;
  sendEmail: (input: Omit<SentEmail, "id" | "date"> & { date?: string }) => void;
  removeProjectEmail: (projectId: string, emailId: string) => void;
  addEmailTemplate: (t: Omit<EmailTemplate, "id">) => void;
  updateEmailTemplate: (id: string, patch: Partial<EmailTemplate>) => void;
  deleteEmailTemplate: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  clients: [],
  projects: [createCrmDocumentVaultProject()],
  calendarEvents: [],
  reminderDrafts: [],
  emailTemplates: [],
  sentEmails: [],

  setClients: (clients) => set(() => ({ clients })),
  upsertClient: (client) =>
    set((s) => {
      const exists = s.clients.some((c) => c.id === client.id);
      if (exists) {
        return { clients: s.clients.map((c) => (c.id === client.id ? client : c)) };
      }
      return { clients: [client, ...s.clients] };
    }),
  removeClientFromList: (id) =>
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),

  addClient: (input) => {
    const newClient: Client = {
      ...input,
      id: uid("c"),
      createdAt: new Date().toISOString().split("T")[0],
      projectCount: 0,
    };
    set((s) => ({ clients: [newClient, ...s.clients] }));
    return newClient;
  },
  updateClient: (id, patch) =>
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  deleteClient: (id) =>
    set((s) => ({
      clients: s.clients.filter((c) => c.id !== id),
      projects: s.projects.filter((p) => p.clientId !== id),
    })),

  addProject: (input) => {
    const newProject: Project = {
      ...input,
      id: uid("p"),
      createdAt: new Date().toISOString().split("T")[0],
      emails: [],
      documents: (input.documents ?? []).map((d) => ({
        ...d,
        attachedFileIds: d.attachedFileIds ?? [],
      })),
      tasks: input.tasks ?? [],
      deadlines: input.deadlines ?? [],
      attachments: input.attachments ?? [],
      fileFolders: input.fileFolders ?? defaultFileFolders(),
    };
    set((s) => {
      // bump project count on linked client
      const clients = s.clients.map((c) =>
        c.id === newProject.clientId ? { ...c, projectCount: c.projectCount + 1 } : c
      );
      return { projects: [newProject, ...s.projects], clients };
    });
    return newProject;
  },
  setProjects: (projects) => {
    set((s) => {
      const vault = s.projects.find((p) => p.isCrmDocumentVault || p.id === CRM_DOCUMENT_VAULT_PROJECT_ID);
      if (!vault) return { projects };
      const alreadyIncluded = projects.some((p) => p.id === vault.id);
      if (alreadyIncluded) return { projects };
      return { projects: [...projects, vault] };
    });
    notifyNavBadgeRefresh();
  },
  upsertProject: (project) => {
    set((s) => {
      const exists = s.projects.some((p) => p.id === project.id);
      if (exists) {
        return { projects: s.projects.map((p) => (p.id === project.id ? project : p)) };
      }
      return { projects: [project, ...s.projects] };
    });
    notifyNavBadgeRefresh();
  },
  updateProject: (id, patch) =>
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  deleteProject: (id) => {
    if (id === CRM_DOCUMENT_VAULT_PROJECT_ID) return;
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
    notifyNavBadgeRefresh();
  },
  setProjectStage: (id, stage) =>
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, stage } : p)) })),
  setNextStep: (id, nextStep, nextStepDate) =>
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, nextStep, nextStepDate } : p)) })),

  setDocStatus: (projectId, docId, status, customStatus) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              documents: p.documents.map((d) =>
                d.id === docId ? { ...d, status, ...(customStatus !== undefined ? { customStatus } : {}) } : d
              ),
            }
      ),
    }));
    notifyNavBadgeRefresh();
  },
  addProjectDocument: (projectId, name) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              documents: [
                ...p.documents,
                { id: uid("doc"), name, status: "Pending", required: false, notes: [], attachedFileIds: [] },
              ],
            }
      ),
    })),
  bulkSetDocStatus: (projectId, docIds, status) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              documents: p.documents.map((d) =>
                docIds.includes(d.id) ? { ...d, status } : d
              ),
            }
      ),
    })),

  addStoredFileToPool: (projectId, file, folderId, uploadedBy) => {
    const today = new Date().toISOString().split("T")[0];
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const id = uid("sf");
        const localObjectUrl = URL.createObjectURL(file);
        const newFile: FileAttachment = {
          id,
          name: file.name,
          size: formatFileSize(file.size),
          uploadedBy,
          uploadedAt: today,
          type: file.type || "application/octet-stream",
          folderId: folderId ?? null,
          localObjectUrl,
        };
        return { ...p, attachments: [newFile, ...p.attachments] };
      }),
    }));
  },

  hydrateProjectFilePool: (projectId, { attachments, fileFolders }) =>
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const ids = new Set(attachments.map((a) => a.id));
        const documents = p.documents.map((d) => {
          const attachedFileIds = (d.attachedFileIds ?? []).filter((id) => ids.has(id));
          return {
            ...d,
            attachedFileIds,
            uploadedFile: docUploadedSnapshot(attachments, attachedFileIds),
          };
        });
        return {
          ...p,
          attachments,
          fileFolders: fileFolders ?? p.fileFolders ?? [],
          documents,
        };
      }),
    })),

  appendProjectAttachments: (projectId, files) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId ? p : { ...p, attachments: [...files, ...p.attachments] }
      ),
    })),

  deleteStoredFile: (projectId, fileId) => {
    const p = get().projects.find((x) => x.id === projectId);
    if (!p) return "missing";
    if (p.documents.some((d) => (d.attachedFileIds ?? []).includes(fileId))) return "linked";
    const file = p.attachments.find((a) => a.id === fileId);
    if (!file) return "missing";
    if (file.localObjectUrl) URL.revokeObjectURL(file.localObjectUrl);
    set((s) => ({
      projects: s.projects.map((proj) =>
        proj.id !== projectId
          ? proj
          : { ...proj, attachments: proj.attachments.filter((a) => a.id !== fileId) }
      ),
    }));
    return "ok";
  },

  moveStoredFileToFolder: (projectId, fileId, folderId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              attachments: p.attachments.map((a) =>
                a.id === fileId ? { ...a, folderId: folderId ?? null } : a
              ),
            }
      ),
    })),

  renameStoredFileInPool: (projectId, fileId, name) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              attachments: p.attachments.map((a) =>
                a.id === fileId ? { ...a, name: name.trim() || a.name } : a
              ),
            }
      ),
    })),

  addProjectFileFolder: (projectId, name, parentId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              fileFolders: [
                ...(p.fileFolders ?? []),
                { id: uid("fld"), name: name.trim(), parentId: parentId ?? null },
              ],
            }
      ),
    })),

  removeProjectFileFolder: (projectId, folderId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              fileFolders: (p.fileFolders ?? []).filter((f) => f.id !== folderId),
            }
      ),
    })),

  attachStoredFilesToDocument: (projectId, docId, fileIds) =>
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const uniq = new Set(fileIds);
        const docs = p.documents.map((d) => {
          if (d.id !== docId) return d;
          const merged = [...new Set([...(d.attachedFileIds ?? []), ...uniq])];
          return {
            ...d,
            attachedFileIds: merged,
            uploadedFile: docUploadedSnapshot(p.attachments, merged),
          };
        });
        return { ...p, documents: docs };
      }),
    })),

  detachStoredFileFromDocument: (projectId, docId, fileId) =>
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const docs = p.documents.map((d) => {
          if (d.id !== docId) return d;
          const attachedFileIds = (d.attachedFileIds ?? []).filter((id) => id !== fileId);
          return {
            ...d,
            attachedFileIds,
            uploadedFile: docUploadedSnapshot(p.attachments, attachedFileIds),
          };
        });
        return { ...p, documents: docs };
      }),
    })),

  uploadFileToDocument: (projectId, docId, file, uploadedBy) => {
    const today = new Date().toISOString().split("T")[0];
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const id = uid("sf");
        const localObjectUrl = URL.createObjectURL(file);
        const newFile: FileAttachment = {
          id,
          name: file.name,
          size: formatFileSize(file.size),
          uploadedBy,
          uploadedAt: today,
          type: file.type || "application/octet-stream",
          folderId: null,
          localObjectUrl,
        };
        const attachments = [newFile, ...p.attachments];
        const documents = p.documents.map((d) => {
          if (d.id !== docId) return d;
          const attachedFileIds = [...new Set([...(d.attachedFileIds ?? []), id])];
          return {
            ...d,
            attachedFileIds,
            uploadedFile: docUploadedSnapshot(attachments, attachedFileIds),
          };
        });
        return { ...p, attachments, documents };
      }),
    }));
  },

  addProjectTask: (projectId, task) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId ? p : { ...p, tasks: [...p.tasks, { ...task, id: uid("t") }] }
      ),
    })),
  setTaskStatus: (projectId, taskId, status) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === taskId
                  ? { ...t, status, completedDate: status === "Complete" ? new Date().toISOString().split("T")[0] : undefined }
                  : t
              ),
            }
      ),
    }));
    notifyNavBadgeRefresh();
  },

  updateProjectTask: (projectId, taskId, patch) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              tasks: p.tasks.map((t) => {
                if (t.id !== taskId) return t;
                const status = patch.status ?? t.status;
                return {
                  ...t,
                  ...patch,
                  status,
                  completedDate:
                    status === "Complete"
                      ? t.completedDate ?? new Date().toISOString().split("T")[0]
                      : patch.status !== undefined
                        ? undefined
                        : t.completedDate,
                };
              }),
            }
      ),
    }));
    notifyNavBadgeRefresh();
  },

  deleteProjectTask: (projectId, taskId) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId ? p : { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }
      ),
      calendarEvents: s.calendarEvents.filter(
        (e) => !(e.projectId === projectId && e.id === taskId)
      ),
    }));
    notifyNavBadgeRefresh();
  },

  addProjectTaskNote: (projectId, taskId, note) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === taskId ? { ...t, notes: [note, ...(t.notes ?? [])] } : t
              ),
            }
      ),
    })),

  updateProjectTaskNote: (projectId, taskId, noteId, text) => {
    const today = new Date().toISOString().split("T")[0];
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id !== taskId
                  ? t
                  : {
                      ...t,
                      notes: (t.notes ?? []).map((n) =>
                        n.id === noteId ? { ...n, text, updatedAt: today } : n
                      ),
                    }
              ),
            }
      ),
    }));
  },

  deleteProjectTaskNote: (projectId, taskId, noteId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === taskId ? { ...t, notes: (t.notes ?? []).filter((n) => n.id !== noteId) } : t
              ),
            }
      ),
    })),

  addCalendarEvent: (e) =>
    set((s) => ({ calendarEvents: [...s.calendarEvents, { ...e, id: uid("ce") }] })),
  addProjectDeadline: (projectId, title, date, type) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : { ...p, deadlines: [...p.deadlines, { id: uid("dl"), title, date, type }] }
      ),
      calendarEvents: (() => {
        const project = s.projects.find((p) => p.id === projectId);
        if (!project) return s.calendarEvents;
        return [
          ...s.calendarEvents,
          {
            id: uid("ce"),
            title,
            date,
            projectId,
            projectName: project.name,
            type,
            propertyAddress: project.propertyAddress,
          },
        ];
      })(),
    })),

  updateProjectNote: (projectId, noteId, body) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              notes: (p.notes ?? []).map((n) =>
                n.id === noteId
                  ? { ...n, body, updatedAt: new Date().toISOString().split("T")[0] }
                  : n
              ),
            }
      ),
    })),

  deleteProjectNote: (projectId, noteId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId ? p : { ...p, notes: (p.notes ?? []).filter((n) => n.id !== noteId) }
      ),
    })),

  updateProjectDeadlineDate: (projectId, deadlineId, date) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : {
              ...p,
              deadlines: p.deadlines.map((d) => (d.id === deadlineId ? { ...d, date } : d)),
            }
      ),
      calendarEvents: s.calendarEvents.map((e) =>
        e.projectId === projectId && e.id === deadlineId ? { ...e, date } : e
      ),
    })),

  deleteProjectDeadline: (projectId, deadlineId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId ? p : { ...p, deadlines: p.deadlines.filter((d) => d.id !== deadlineId) }
      ),
      calendarEvents: s.calendarEvents.filter(
        (e) => !(e.projectId === projectId && e.id === deadlineId)
      ),
    })),

  dismissReminder: (id) => {
    set((s) => ({ reminderDrafts: s.reminderDrafts.filter((r) => r.id !== id) }));
    notifyNavBadgeRefresh();
  },
  sendReminder: (id) =>
    set((s) => {
      const r = s.reminderDrafts.find((x) => x.id === id);
      if (!r) return {};
      const sent: SentEmail = {
        id: uid("se"),
        to: r.clientName,
        subject: r.subject,
        body: r.body,
        date: new Date().toISOString().split("T")[0],
        projectId: r.projectId,
      };
      const projects = r.projectId
        ? s.projects.map((p) =>
            p.id !== r.projectId
              ? p
              : {
                  ...p,
                  emails: [
                    ...p.emails,
                    {
                      id: sent.id,
                      subject: sent.subject,
                      from: "kathryn@portal.com",
                      to: sent.to,
                      date: sent.date,
                      body: sent.body,
                      direction: "outbound" as const,
                      deliveryStatus: "sent",
                    } satisfies EmailThread,
                  ],
                }
          )
        : s.projects;
      return {
        reminderDrafts: s.reminderDrafts.filter((x) => x.id !== id),
        sentEmails: [sent, ...s.sentEmails],
        projects,
      };
    }),

  setEmailTemplates: (emailTemplates) => set(() => ({ emailTemplates })),
  sendEmail: (input) => {
    const sent: SentEmail = {
      id: uid("se"),
      date: input.date ?? new Date().toISOString().split("T")[0],
      to: input.to,
      subject: input.subject,
      body: input.body,
      projectId: input.projectId,
    };
    set((s) => {
      let projects = s.projects;
      if (input.projectId) {
        projects = s.projects.map((p) =>
          p.id !== input.projectId
            ? p
            : {
                ...p,
                emails: [
                  ...p.emails,
                  {
                    id: sent.id,
                    subject: sent.subject,
                    from: "kathryn@portal.com",
                    to: sent.to,
                    date: sent.date,
                    body: sent.body,
                    direction: "outbound" as const,
                    deliveryStatus: "sent",
                  } satisfies EmailThread,
                ],
              }
        );
      }
      return { sentEmails: [sent, ...s.sentEmails], projects };
    });
  },

  removeProjectEmail: (projectId, emailId) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id !== projectId ? p : { ...p, emails: p.emails.filter((e) => e.id !== emailId) }
      ),
    }));
    notifyNavBadgeRefresh();
  },

  addEmailTemplate: (t) =>
    set((s) => ({ emailTemplates: [...s.emailTemplates, { ...t, id: uid("et") }] })),
  updateEmailTemplate: (id, patch) =>
    set((s) => ({
      emailTemplates: s.emailTemplates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  deleteEmailTemplate: (id) =>
    set((s) => ({ emailTemplates: s.emailTemplates.filter((t) => t.id !== id) })),
}));

// Convenience hook for a single project
export const useProject = (id: string | undefined) =>
  useAppStore((s) => s.projects.find((p) => p.id === id));
export const useClient = (id: string | undefined) =>
  useAppStore((s) => s.clients.find((c) => c.id === id));
