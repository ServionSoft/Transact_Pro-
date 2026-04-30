import { getApiBaseUrl } from "@/lib/apiConfig";
import type { Project, ProjectDocument, ProjectTask, ProjectType, ProjectStage } from "@/data/mockData";
import { ApiRequestError } from "@/api/storedFiles";
import { authFetch } from "@/lib/authFetch";

export type ProjectListItem = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  propertyAddress: string;
  type: "Listing" | "Buyer File";
  stage: ProjectStage;
  nextStep: string;
  nextStepDate: string;
  yearBuilt: string;
  propertyType: string;
  representationSide: string;
  escrowOfficer: string;
  escrowCompany: string;
  listPrice: string;
  createdAt: string;
  documentsCompleteCount: number;
  documentsTotalCount: number;
  tasksCompleteCount: number;
  tasksTotalCount: number;
  deadlinesCount: number;
  filesCount: number;
};

type ProjectDetailApiRow = Omit<ProjectListItem, "documentsCompleteCount" | "documentsTotalCount" | "tasksCompleteCount" | "tasksTotalCount" | "deadlinesCount" | "filesCount"> & {
  documents: Array<{
    id: string;
    name: string;
    status: ProjectDocument["status"];
    customStatus?: string;
    required: boolean;
    notes: Array<{ id?: string; body?: string; createdAt?: string; author?: string; date?: string; text?: string }>;
    attachedFileIds: string[];
  }>;
  tasks: Array<{
    id: string;
    title: string;
    stage: ProjectTask["stage"];
    status: ProjectTask["status"];
    dueDate: string;
    completedDate?: string;
  }>;
  emails: Array<{
    id: string;
    subject: string;
    from: string;
    to: string;
    date: string;
    body: string;
    direction: "inbound" | "outbound";
    deliveryStatus?: "pending" | "sent" | "failed";
    deliveryError?: string | null;
  }>;
  notes: Array<{
    id: string;
    body: string;
    author: string;
    createdAt: string;
  }>;
  assignees: Array<{
    userId: string;
    name: string;
    email: string;
    designation?: string | null;
  }>;
  deadlines: Array<{ id: string; title: string; date: string; type: string }>;
  metadata?: Record<string, unknown>;
};

export type ProjectCreateBody = {
  name: string;
  clientId: string;
  propertyAddress: string;
  type: "Listing" | "Buyer File";
  stage?: ProjectStage;
  nextStep?: string;
  nextStepDate?: string;
  yearBuilt?: string;
  propertyType?: string;
  representationSide?: string;
  escrowOfficer?: string;
  escrowCompany?: string;
  listPrice?: string;
  city?: string;
  state?: string;
  zip?: string;
  documents?: Array<{
    name: string;
    status?: ProjectDocument["status"];
    customStatus?: string;
    required?: boolean;
    sourceRuleId?: string;
    sourceRuleActionId?: string;
  }>;
  metadata?: Record<string, unknown>;
};

function requireBase(): string {
  const base = getApiBaseUrl();
  if (!base) throw new Error("VITE_API_URL is not set");
  return base.replace(/\/+$/, "");
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

function readErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object" && "error" in json) {
    const err = (json as { error?: { message?: string } }).error;
    if (typeof err?.message === "string" && err.message.trim()) return err.message;
  }
  return fallback;
}

async function apiCall(path: string, init?: RequestInit): Promise<unknown> {
  const url = `${requireBase()}${path}`;
  let res: Response;
  try {
    res = await authFetch(url, init);
  } catch (e) {
    throw new ApiRequestError(`No response from ${getApiBaseUrl() ?? "API"}.`, 0, e instanceof Error ? e.message : String(e));
  }
  const json = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiRequestError(readErrorMessage(json, `Projects request failed (${res.status})`), res.status, typeof json === "object" ? JSON.stringify(json) : String(json));
  }
  return json;
}

function mapProjectType(type: string): ProjectType {
  if (type === "Buyer File") return "Buyer File";
  return "Listing";
}

function mapDetailRowToProject(row: ProjectDetailApiRow): Project {
  return {
    id: row.id,
    name: row.name,
    clientId: row.clientId,
    clientName: row.clientName,
    propertyAddress: row.propertyAddress,
    type: mapProjectType(row.type),
    stage: row.stage,
    nextStep: row.nextStep ?? "",
    nextStepDate: row.nextStepDate ?? "",
    yearBuilt: row.yearBuilt ?? "",
    propertyType: row.propertyType ?? "",
    representationSide: row.representationSide ?? "",
    escrowOfficer: row.escrowOfficer ?? "",
    escrowCompany: row.escrowCompany ?? "",
    listPrice: row.listPrice ?? "—",
    createdAt: row.createdAt,
    documents: (row.documents ?? []).map((doc) => ({
      ...doc,
      notes: (doc.notes ?? []).map((n) => ({
        date: n.createdAt ?? n.date ?? "",
        text: n.body ?? n.text ?? "",
        author: n.author ?? "Unknown",
      })),
    })),
    tasks: row.tasks ?? [],
    emails: (row.emails ?? []).map((em) => ({
      ...em,
      deliveryStatus: em.deliveryStatus ?? "sent",
      ...(em.deliveryError != null && em.deliveryError !== "" ? { deliveryError: em.deliveryError } : {}),
    })),
    notes: row.notes ?? [],
    assignees: row.assignees ?? [],
    deadlines: row.deadlines ?? [],
    attachments: [],
    fileFolders: [],
    ...(row.metadata ? { metadata: row.metadata } : {}),
  };
}

export async function listProjectsFromApi(options?: {
  search?: string;
  stage?: string;
  archived?: boolean;
  clientId?: string;
}): Promise<ProjectListItem[]> {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.stage && options.stage !== "All") params.set("stage", options.stage);
  if (options?.archived) params.set("archived", "true");
  if (options?.clientId?.trim()) params.set("clientId", options.clientId.trim());
  const query = params.toString();
  const json = await apiCall(`/api/projects${query ? `?${query}` : ""}`);
  const rows = (json as { data?: { projects?: unknown } }).data?.projects;
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => r as ProjectListItem);
}

export async function getProjectFromApi(id: string): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(id)}`);
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid project response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function createProjectApi(body: ProjectCreateBody): Promise<Project> {
  const json = await apiCall("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid create response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function updateProjectApi(id: string, body: ProjectCreateBody): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid update response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function patchProjectNextStepApi(id: string, nextStep: string, nextStepDate: string): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(id)}/next-step`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nextStep, nextStepDate }),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid next-step response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function patchProjectStageApi(id: string, stage: ProjectStage): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(id)}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid stage response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function patchProjectDocumentStatusApi(
  projectId: string,
  documentId: string,
  status: ProjectDocument["status"],
  customStatus?: string
): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, customStatus }),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid document update response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function createProjectDocumentNoteApi(
  projectId: string,
  documentId: string,
  body: string
): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid document note create response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function createProjectDocumentApi(projectId: string, name: string): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(projectId)}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid document create response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function deleteProjectDocumentApi(projectId: string, documentId: string): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(documentId)}`, {
    method: "DELETE",
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid document delete response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function deleteProjectApi(projectId: string): Promise<void> {
  await apiCall(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}

export async function patchProjectTaskStatusApi(
  projectId: string,
  taskId: string,
  status: "Pending" | "In Progress" | "Complete"
): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid task status response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function createProjectTaskApi(
  projectId: string,
  body: { title: string; stage: ProjectStage; status?: "Pending" | "In Progress" | "Complete"; dueDate?: string }
): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(projectId)}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid task create response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function patchProjectTasksBulkStatusApi(
  projectId: string,
  taskIds: string[],
  status: "Pending" | "In Progress" | "Complete"
): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(projectId)}/tasks/bulk`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskIds, status }),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid bulk task status response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function createProjectDeadlineApi(
  projectId: string,
  body: { title: string; date: string; type?: string }
): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(projectId)}/deadlines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid deadline create response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function createProjectEmailApi(
  projectId: string,
  body: { to: string; subject: string; body: string; from?: string }
): Promise<{ project: Project; emailSendFailed?: boolean; emailSendError?: string }> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(projectId)}/emails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (json as { data?: { project?: unknown; emailSendFailed?: boolean; emailSendError?: string } }).data;
  const row = data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid email create response", 500, "");
  }
  return {
    project: mapDetailRowToProject(row as ProjectDetailApiRow),
    ...(data?.emailSendFailed ? { emailSendFailed: true as const, emailSendError: data.emailSendError } : {}),
  };
}

export async function createProjectNoteApi(projectId: string, body: string): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(projectId)}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid note create response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}

export async function listProjectAssignmentOptionsApi(): Promise<
  Array<{ id: string; name: string; email: string; designation?: string | null }>
> {
  const json = await apiCall("/api/projects/assignment-options");
  const rows = (json as { data?: { users?: unknown } }).data?.users;
  if (!Array.isArray(rows)) return [];
  return rows as Array<{ id: string; name: string; email: string; designation?: string | null }>;
}

export async function setProjectAssignmentsApi(projectId: string, userIds: string[]): Promise<Project> {
  const json = await apiCall(`/api/projects/${encodeURIComponent(projectId)}/assignments`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds }),
  });
  const row = (json as { data?: { project?: unknown } }).data?.project;
  if (!row || typeof row !== "object") {
    throw new ApiRequestError("Invalid assignment update response", 500, "");
  }
  return mapDetailRowToProject(row as ProjectDetailApiRow);
}
