import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { getSmtpSettings, sendMailWithStoredSettings } from "./smtpSettingsService.js";

export type ProjectStageUi = "Listing Prep" | "Listing Complete" | "In Escrow" | "Ready to Close" | "Closed";
export type ProjectTypeUi = "Listing" | "Buyer File";
export type TaskStatusUi = "Pending" | "In Progress" | "Complete";
export type DocumentStatusUi =
  | "Pending"
  | "Needs Buyer Signature"
  | "Needs Seller Signature"
  | "Out for Signature"
  | "Signed — Needs Upload"
  | "Uploaded to Brokerage"
  | "Complete"
  | "Other";

export type ProjectDocumentApi = {
  id: string;
  name: string;
  status: DocumentStatusUi;
  customStatus?: string;
  required: boolean;
  notes: ProjectDocumentNoteApi[];
  attachedFileIds: string[];
  sourceRuleId?: string;
  sourceRuleActionId?: string;
};

export type ProjectDocumentNoteApi = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
};

export type ProjectTaskApi = {
  id: string;
  title: string;
  stage: ProjectStageUi;
  status: TaskStatusUi;
  dueDate: string;
  completedDate?: string;
};

export type ProjectDeadlineApi = {
  id: string;
  title: string;
  date: string;
  type: string;
};

export type ProjectEmailApi = {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  direction: "inbound" | "outbound";
  deliveryStatus: "pending" | "sent" | "failed";
  deliveryError?: string | null;
};

export type ProjectNoteApi = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
};

export type ProjectAssigneeApi = {
  userId: string;
  name: string;
  email: string;
  designation?: string | null;
};

export type ProjectListItemApi = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  propertyAddress: string;
  type: ProjectTypeUi;
  stage: ProjectStageUi;
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

export type ProjectDetailApi = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  propertyAddress: string;
  type: ProjectTypeUi;
  stage: ProjectStageUi;
  nextStep: string;
  nextStepDate: string;
  yearBuilt: string;
  propertyType: string;
  representationSide: string;
  escrowOfficer: string;
  escrowCompany: string;
  listPrice: string;
  createdAt: string;
  documents: ProjectDocumentApi[];
  tasks: ProjectTaskApi[];
  emails: ProjectEmailApi[];
  notes: ProjectNoteApi[];
  assignees: ProjectAssigneeApi[];
  deadlines: ProjectDeadlineApi[];
  metadata?: Record<string, unknown>;
};

export type ProjectCreateInput = {
  name: string;
  clientId: string;
  propertyAddress: string;
  type: ProjectTypeUi;
  stage?: ProjectStageUi;
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
    status?: DocumentStatusUi;
    customStatus?: string;
    required?: boolean;
    sourceRuleId?: string;
    sourceRuleActionId?: string;
  }>;
  metadata?: Record<string, unknown>;
};

export type ServiceError = {
  status: number;
  code: string;
  message: string;
};

const STAGE_UI_TO_DB: Record<ProjectStageUi, "listing_prep" | "listing_complete" | "in_escrow" | "ready_to_close" | "closed"> = {
  "Listing Prep": "listing_prep",
  "Listing Complete": "listing_complete",
  "In Escrow": "in_escrow",
  "Ready to Close": "ready_to_close",
  Closed: "closed",
};

const STAGE_DB_TO_UI: Record<string, ProjectStageUi> = {
  listing_prep: "Listing Prep",
  listing_complete: "Listing Complete",
  in_escrow: "In Escrow",
  ready_to_close: "Ready to Close",
  closed: "Closed",
};

const TYPE_UI_TO_DB: Record<ProjectTypeUi, "listing" | "buyer_file"> = {
  Listing: "listing",
  "Buyer File": "buyer_file",
};

const TYPE_DB_TO_UI: Record<string, ProjectTypeUi> = {
  listing: "Listing",
  buyer_file: "Buyer File",
};

const TASK_STATUS_DB_TO_UI: Record<string, TaskStatusUi> = {
  pending: "Pending",
  in_progress: "In Progress",
  complete: "Complete",
};

const DOC_STATUS_DB_TO_UI: Record<string, DocumentStatusUi> = {
  pending: "Pending",
  needs_buyer_signature: "Needs Buyer Signature",
  needs_seller_signature: "Needs Seller Signature",
  out_for_signature: "Out for Signature",
  signed_needs_upload: "Signed — Needs Upload",
  uploaded_to_brokerage: "Uploaded to Brokerage",
  completed: "Complete",
  other: "Other",
};

const DOC_STATUS_UI_TO_DB: Record<DocumentStatusUi, string> = {
  Pending: "pending",
  "Needs Buyer Signature": "needs_buyer_signature",
  "Needs Seller Signature": "needs_seller_signature",
  "Out for Signature": "out_for_signature",
  "Signed — Needs Upload": "signed_needs_upload",
  "Uploaded to Brokerage": "uploaded_to_brokerage",
  Complete: "completed",
  Other: "other",
};

function normalizeText(v: string | undefined): string {
  return (v ?? "").trim();
}

function mapStageToDb(v: string | undefined): keyof typeof STAGE_DB_TO_UI | null {
  if (!v) return null;
  return STAGE_UI_TO_DB[v as ProjectStageUi] ?? null;
}

function mapTypeToDb(v: string | undefined): keyof typeof TYPE_DB_TO_UI | null {
  if (!v) return null;
  return TYPE_UI_TO_DB[v as ProjectTypeUi] ?? null;
}

function formatMoney(raw: number | string | null): string {
  if (raw == null || raw === "") return "—";
  const asNum = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(asNum)) return "—";
  return `$${asNum.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function parseMoneyToNumber(raw: string | undefined): number | null {
  const t = normalizeText(raw);
  if (!t) return null;
  const cleaned = t.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDateString(raw: string | undefined): string | null {
  const t = normalizeText(raw);
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function validateCreateInput(input: ProjectCreateInput): ServiceError | null {
  if (!normalizeText(input.name)) {
    return { status: 400, code: "PROJECT_NAME_REQUIRED", message: "Project name is required." };
  }
  if (!/^\d+$/.test(normalizeText(input.clientId))) {
    return { status: 400, code: "PROJECT_CLIENT_REQUIRED", message: "Valid clientId is required." };
  }
  if (!normalizeText(input.propertyAddress)) {
    return { status: 400, code: "PROJECT_ADDRESS_REQUIRED", message: "Property address is required." };
  }
  if (!mapTypeToDb(input.type)) {
    return { status: 400, code: "PROJECT_TYPE_INVALID", message: "Project type must be Listing or Buyer File." };
  }
  if (input.stage && !mapStageToDb(input.stage)) {
    return { status: 400, code: "PROJECT_STAGE_INVALID", message: "Project stage is invalid." };
  }
  return null;
}

type ProjectListRow = {
  id: string;
  name: string;
  client_id: string;
  client_name: string;
  property_address: string;
  transaction_type: string;
  stage: string;
  next_step_text: string | null;
  next_step_date: string | null;
  year_built: string | null;
  property_type: string | null;
  representation_side: string | null;
  escrow_officer_name: string | null;
  escrow_company: string | null;
  list_price: number | string | null;
  created_at: Date;
  docs_complete_count: number | string | null;
  docs_total_count: number | string | null;
  tasks_complete_count: number | string | null;
  tasks_total_count: number | string | null;
  deadlines_count: number | string | null;
  files_count: number | string | null;
};

function mapListRow(row: ProjectListRow): ProjectListItemApi {
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id,
    clientName: row.client_name,
    propertyAddress: row.property_address,
    type: TYPE_DB_TO_UI[row.transaction_type] ?? "Listing",
    stage: STAGE_DB_TO_UI[row.stage] ?? "Listing Prep",
    nextStep: row.next_step_text ?? "",
    nextStepDate: row.next_step_date ?? "",
    yearBuilt: row.year_built ?? "",
    propertyType: row.property_type ?? "",
    representationSide: row.representation_side ?? "",
    escrowOfficer: row.escrow_officer_name ?? "",
    escrowCompany: row.escrow_company ?? "",
    listPrice: formatMoney(row.list_price),
    createdAt: row.created_at.toISOString().split("T")[0],
    documentsCompleteCount: Number(row.docs_complete_count ?? 0),
    documentsTotalCount: Number(row.docs_total_count ?? 0),
    tasksCompleteCount: Number(row.tasks_complete_count ?? 0),
    tasksTotalCount: Number(row.tasks_total_count ?? 0),
    deadlinesCount: Number(row.deadlines_count ?? 0),
    filesCount: Number(row.files_count ?? 0),
  };
}

export async function listProjects(
  pool: Pool,
  options?: { search?: string; stage?: string; archived?: boolean; excludeProjectId?: number; clientId?: string }
): Promise<ProjectListItemApi[]> {
  const archived = options?.archived === true;
  const search = normalizeText(options?.search);
  const stageDb = mapStageToDb(options?.stage);
  const excludeProjectId = Number.isInteger(options?.excludeProjectId) ? Number(options?.excludeProjectId) : null;
  const clientIdFilter = normalizeText(options?.clientId);
  const params: unknown[] = [];
  const where: string[] = [archived ? "p.deleted_at IS NOT NULL" : "p.deleted_at IS NULL"];
  if (clientIdFilter && /^\d+$/.test(clientIdFilter)) {
    params.push(clientIdFilter);
    where.push(`p.client_id = $${params.length}::bigint`);
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where.push(
      `(LOWER(p.name) LIKE $${params.length} OR LOWER(p.property_address) LIKE $${params.length} OR LOWER(c.name) LIKE $${params.length})`
    );
  }
  if (stageDb) {
    params.push(stageDb);
    where.push(`p.stage = $${params.length}::public.project_stage`);
  }
  if (excludeProjectId != null) {
    params.push(excludeProjectId);
    where.push(`p.id <> $${params.length}::bigint`);
  }
  const { rows } = await pool.query<ProjectListRow>(
    `SELECT
       p.id::text,
       p.name,
       p.client_id::text,
       c.name AS client_name,
       p.property_address,
       p.transaction_type::text,
       p.stage::text,
       p.next_step_text,
       p.next_step_date::text,
       p.year_built,
       p.property_type,
       p.representation_side,
       co.full_name AS escrow_officer_name,
       p.escrow_company,
       p.list_price,
       p.created_at,
       COUNT(DISTINCT pd.id) FILTER (WHERE pd.status = 'completed'::public.document_status) AS docs_complete_count,
       COUNT(DISTINCT pd.id) AS docs_total_count,
       COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'complete'::public.task_status) AS tasks_complete_count,
       COUNT(DISTINCT pt.id) AS tasks_total_count,
       COUNT(DISTINCT pdl.id) FILTER (WHERE pdl.is_completed = false) AS deadlines_count,
       COUNT(DISTINCT sf.id) FILTER (WHERE sf.deleted_at IS NULL) AS files_count
     FROM public.projects p
     JOIN public.clients c ON c.id = p.client_id
     LEFT JOIN public.contacts co ON co.id = p.escrow_officer_contact_id
     LEFT JOIN public.project_documents pd ON pd.project_id = p.id AND pd.deleted_at IS NULL
     LEFT JOIN public.project_tasks pt ON pt.project_id = p.id
     LEFT JOIN public.project_deadlines pdl ON pdl.project_id = p.id
     LEFT JOIN public.stored_files sf ON sf.project_id = p.id
     WHERE ${where.join(" AND ")}
     GROUP BY p.id, c.name, co.full_name
     ORDER BY p.created_at DESC
     LIMIT 1000`,
    params
  );
  return rows.map(mapListRow);
}

async function getProjectTasks(pool: Pool, projectId: string): Promise<ProjectTaskApi[]> {
  const { rows } = await pool.query<{
    id: string;
    title: string;
    stage: string;
    status: string;
    due_date: string | null;
    completed_at: Date | null;
  }>(
    `SELECT id::text, title, stage::text, status::text, due_date::text, completed_at
     FROM public.project_tasks
     WHERE project_id = $1::bigint
     ORDER BY created_at ASC`,
    [projectId]
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    stage: STAGE_DB_TO_UI[r.stage] ?? "Listing Prep",
    status: TASK_STATUS_DB_TO_UI[r.status] ?? "Pending",
    dueDate: r.due_date ?? "",
    ...(r.completed_at ? { completedDate: r.completed_at.toISOString().split("T")[0] } : {}),
  }));
}

async function getProjectDeadlines(pool: Pool, projectId: string): Promise<ProjectDeadlineApi[]> {
  const { rows } = await pool.query<{ id: string; title: string; due_date: string; type: string }>(
    `SELECT id::text, title, due_date::text, type::text
     FROM public.project_deadlines
     WHERE project_id = $1::bigint
     ORDER BY due_date ASC`,
    [projectId]
  );
  return rows.map((r) => ({ id: r.id, title: r.title, date: r.due_date, type: r.type }));
}

function mapDeliveryStatus(s: string | null | undefined): "pending" | "sent" | "failed" {
  if (s === "pending" || s === "failed") return s;
  return "sent";
}

async function getProjectEmails(pool: Pool, projectId: string): Promise<ProjectEmailApi[]> {
  const { rows } = await pool.query<{
    id: string;
    subject: string;
    from_address: string;
    to_address: string;
    body: string;
    direction: string;
    sent_at: Date | null;
    created_at: Date;
    delivery_status: string | null;
    delivery_error: string | null;
  }>(
    `SELECT id::text, subject, from_address, to_address, body, direction::text, sent_at, created_at,
            delivery_status::text AS delivery_status, delivery_error
     FROM public.emails
     WHERE project_id = $1::bigint
     ORDER BY COALESCE(sent_at, created_at) DESC`,
    [projectId]
  );
  return rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    from: r.from_address,
    to: r.to_address,
    date: (r.sent_at ?? r.created_at).toISOString().split("T")[0],
    body: r.body,
    direction: r.direction === "inbound" ? "inbound" : "outbound",
    deliveryStatus: mapDeliveryStatus(r.delivery_status),
    ...(r.delivery_error?.trim() ? { deliveryError: r.delivery_error.trim() } : {}),
  }));
}

async function getProjectNotes(pool: Pool, projectId: string): Promise<ProjectNoteApi[]> {
  const { rows } = await pool.query<{
    id: string;
    body: string;
    created_at: Date;
    author_name: string | null;
  }>(
    `SELECT
       pn.id::text,
       pn.body,
       pn.created_at,
       u.name AS author_name
     FROM public.project_notes pn
     LEFT JOIN public.users u ON u.id = pn.author_user_id
     WHERE pn.project_id = $1::bigint
     ORDER BY pn.created_at DESC`,
    [projectId]
  );
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    author: r.author_name ?? "Unknown",
    createdAt: r.created_at.toISOString().split("T")[0],
  }));
}

async function getProjectAssignees(pool: Pool, projectId: string): Promise<ProjectAssigneeApi[]> {
  const { rows } = await pool.query<{
    user_id: string;
    name: string;
    email: string;
    designation: string | null;
  }>(
    `SELECT
       u.id::text AS user_id,
       u.name,
       u.email,
       u.designation
     FROM public.project_assignments pa
     JOIN public.users u ON u.id = pa.user_id
     WHERE pa.project_id = $1::bigint
       AND u.deleted_at IS NULL
     ORDER BY u.name ASC`,
    [projectId]
  );
  return rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    email: r.email,
    designation: r.designation,
  }));
}

async function getProjectDocuments(pool: Pool, projectId: string): Promise<ProjectDocumentApi[]> {
  const { rows } = await pool.query<{
    id: string;
    display_name: string;
    status: string;
    custom_status_text: string | null;
    required: boolean;
    source_rule_id: string | null;
    source_rule_action_id: string | null;
    attached_file_ids: string[];
  }>(
    `SELECT
       pd.id::text,
       pd.display_name,
       pd.status::text,
       pd.custom_status_text,
       pd.required,
       pd.source_rule_id::text,
       pd.source_rule_action_id,
       COALESCE(
         ARRAY_AGG(pdf.stored_file_id::text ORDER BY pdf.sort_order NULLS LAST, pdf.id) FILTER (WHERE pdf.id IS NOT NULL),
         ARRAY[]::text[]
       ) AS attached_file_ids
     FROM public.project_documents pd
     LEFT JOIN public.project_document_files pdf ON pdf.project_document_id = pd.id
     WHERE pd.project_id = $1::bigint
       AND pd.deleted_at IS NULL
     GROUP BY pd.id
     ORDER BY pd.created_at ASC`,
    [projectId]
  );
  const noteRows = await pool.query<{
    id: string;
    project_document_id: string;
    body: string;
    created_at: Date;
    author_name: string | null;
  }>(
    `SELECT
       pdn.id::text,
       pdn.project_document_id::text,
       pdn.body,
       pdn.created_at,
       u.name AS author_name
     FROM public.project_document_notes pdn
     LEFT JOIN public.users u ON u.id = pdn.author_user_id
     JOIN public.project_documents pd ON pd.id = pdn.project_document_id
     WHERE pd.project_id = $1::bigint
       AND pd.deleted_at IS NULL
     ORDER BY pdn.created_at DESC`,
    [projectId]
  );
  const notesByDocumentId = new Map<string, ProjectDocumentNoteApi[]>();
  for (const r of noteRows.rows) {
    const list = notesByDocumentId.get(r.project_document_id) ?? [];
    list.push({
      id: r.id,
      body: r.body,
      author: r.author_name ?? "Unknown",
      createdAt: r.created_at.toISOString().split("T")[0],
    });
    notesByDocumentId.set(r.project_document_id, list);
  }
  return rows.map((r) => ({
    id: r.id,
    name: r.display_name,
    status: DOC_STATUS_DB_TO_UI[r.status] ?? "Pending",
    ...(r.custom_status_text ? { customStatus: r.custom_status_text } : {}),
    required: r.required,
    notes: notesByDocumentId.get(r.id) ?? [],
    attachedFileIds: r.attached_file_ids ?? [],
    ...(r.source_rule_id ? { sourceRuleId: r.source_rule_id } : {}),
    ...(r.source_rule_action_id ? { sourceRuleActionId: r.source_rule_action_id } : {}),
  }));
}

export async function getProjectById(pool: Pool, projectId: string): Promise<ProjectDetailApi | null> {
  if (!/^\d+$/.test(projectId)) return null;
  const { rows } = await pool.query<{
    id: string;
    name: string;
    client_id: string;
    client_name: string;
    property_address: string;
    transaction_type: string;
    stage: string;
    next_step_text: string | null;
    next_step_date: string | null;
    year_built: string | null;
    property_type: string | null;
    representation_side: string | null;
    escrow_officer_name: string | null;
    escrow_company: string | null;
    list_price: number | string | null;
    created_at: Date;
    metadata_json: Record<string, unknown> | null;
  }>(
    `SELECT
       p.id::text,
       p.name,
       p.client_id::text,
       c.name AS client_name,
       p.property_address,
       p.transaction_type::text,
       p.stage::text,
       p.next_step_text,
       p.next_step_date::text,
       p.year_built,
       p.property_type,
       p.representation_side,
       co.full_name AS escrow_officer_name,
       p.escrow_company,
       p.list_price,
       p.created_at,
       p.metadata_json
     FROM public.projects p
     JOIN public.clients c ON c.id = p.client_id
     LEFT JOIN public.contacts co ON co.id = p.escrow_officer_contact_id
     WHERE p.id = $1::bigint
       AND p.deleted_at IS NULL
     LIMIT 1`,
    [projectId]
  );
  const row = rows[0];
  if (!row) return null;
  const [documents, tasks, emails, notes, assignees, deadlines] = await Promise.all([
    getProjectDocuments(pool, projectId),
    getProjectTasks(pool, projectId),
    getProjectEmails(pool, projectId),
    getProjectNotes(pool, projectId),
    getProjectAssignees(pool, projectId),
    getProjectDeadlines(pool, projectId),
  ]);
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id,
    clientName: row.client_name,
    propertyAddress: row.property_address,
    type: TYPE_DB_TO_UI[row.transaction_type] ?? "Listing",
    stage: STAGE_DB_TO_UI[row.stage] ?? "Listing Prep",
    nextStep: row.next_step_text ?? "",
    nextStepDate: row.next_step_date ?? "",
    yearBuilt: row.year_built ?? "",
    propertyType: row.property_type ?? "",
    representationSide: row.representation_side ?? "",
    escrowOfficer: row.escrow_officer_name ?? "",
    escrowCompany: row.escrow_company ?? "",
    listPrice: formatMoney(row.list_price),
    createdAt: row.created_at.toISOString().split("T")[0],
    documents,
    tasks,
    emails,
    notes,
    assignees,
    deadlines,
    ...(row.metadata_json ? { metadata: row.metadata_json } : {}),
  };
}

export async function createProject(
  pool: Pool,
  input: ProjectCreateInput,
  createdByUserId: string | null
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  const validation = validateCreateInput(input);
  if (validation) return { error: validation };
  const stageDb = mapStageToDb(input.stage) ?? (input.type === "Buyer File" ? "in_escrow" : "listing_prep");
  const typeDb = mapTypeToDb(input.type);
  if (!typeDb) {
    return { error: { status: 400, code: "PROJECT_TYPE_INVALID", message: "Project type is invalid." } };
  }
  const clientId = normalizeText(input.clientId);
  const clientCheck = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok FROM public.clients WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
    [clientId]
  );
  if (clientCheck.rows.length === 0) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Linked client was not found." } };
  }
  const price = parseMoneyToNumber(input.listPrice);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO public.projects (
       name, client_id, transaction_type, stage, property_address, city, state, zip,
       year_built, property_type, representation_side, escrow_company, next_step_text, next_step_date,
      list_price, metadata_json, created_by_user_id, created_at, updated_at
     ) VALUES (
       $1, $2::bigint, $3::public.transaction_type, $4::public.project_stage, $5, $6, $7, $8,
       $9, $10, $11, $12, $13, $14::date, $15, $16::jsonb, $17::bigint, now(), now()
     )
     RETURNING id::text`,
    [
      normalizeText(input.name),
      clientId,
      typeDb,
      stageDb,
      normalizeText(input.propertyAddress),
      normalizeText(input.city),
      normalizeText(input.state),
      normalizeText(input.zip),
      normalizeText(input.yearBuilt),
      normalizeText(input.propertyType),
      normalizeText(input.representationSide),
      normalizeText(input.escrowCompany),
      normalizeText(input.nextStep),
      parseDateString(input.nextStepDate),
      price,
      input.metadata ? JSON.stringify(input.metadata) : null,
      createdByUserId && /^\d+$/.test(createdByUserId) ? createdByUserId : null,
    ]
  );
  const projectId = rows[0]?.id;
  if (!projectId) {
    return { error: { status: 500, code: "PROJECT_CREATE_FAILED", message: "Could not create project." } };
  }
  const docs = input.documents ?? [];
  for (const d of docs) {
    const name = normalizeText(d.name);
    if (!name) continue;
    const statusDb = DOC_STATUS_UI_TO_DB[d.status ?? "Pending"] ?? "pending";
    await pool.query(
      `INSERT INTO public.project_documents (
         project_id, display_name, status, custom_status_text, required, source_rule_id, source_rule_action_id, created_by_user_id, created_at, updated_at
       ) VALUES (
         $1::bigint, $2, $3::public.document_status, $4, $5, $6::bigint, $7, $8::bigint, now(), now()
       )`,
      [
        projectId,
        name,
        statusDb,
        normalizeText(d.customStatus) || null,
        Boolean(d.required),
        /^\d+$/.test(normalizeText(d.sourceRuleId)) ? normalizeText(d.sourceRuleId) : null,
        normalizeText(d.sourceRuleActionId) || null,
        createdByUserId && /^\d+$/.test(createdByUserId) ? createdByUserId : null,
      ]
    );
  }
  const created = await getProjectById(pool, projectId);
  if (!created) {
    return { error: { status: 500, code: "PROJECT_LOAD_FAILED", message: "Project was created but could not be loaded." } };
  }
  return { project: created };
}

export async function updateProject(
  pool: Pool,
  projectId: string,
  input: ProjectCreateInput
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const validation = validateCreateInput(input);
  if (validation) return { error: validation };
  const stageDb = mapStageToDb(input.stage) ?? (input.type === "Buyer File" ? "in_escrow" : "listing_prep");
  const typeDb = mapTypeToDb(input.type);
  if (!typeDb) {
    return { error: { status: 400, code: "PROJECT_TYPE_INVALID", message: "Project type is invalid." } };
  }
  const clientId = normalizeText(input.clientId);
  const clientCheck = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok FROM public.clients WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
    [clientId]
  );
  if (clientCheck.rows.length === 0) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Linked client was not found." } };
  }
  const price = parseMoneyToNumber(input.listPrice);
  const { rowCount } = await pool.query(
    `UPDATE public.projects
     SET
       name = $1,
       client_id = $2::bigint,
       transaction_type = $3::public.transaction_type,
       stage = $4::public.project_stage,
       property_address = $5,
       city = $6,
       state = $7,
       zip = $8,
       year_built = $9,
       property_type = $10,
       representation_side = $11,
       escrow_company = $12,
       next_step_text = $13,
       next_step_date = $14::date,
       list_price = $15,
       metadata_json = $16::jsonb,
       updated_at = now()
     WHERE id = $17::bigint
       AND deleted_at IS NULL`,
    [
      normalizeText(input.name),
      clientId,
      typeDb,
      stageDb,
      normalizeText(input.propertyAddress),
      normalizeText(input.city),
      normalizeText(input.state),
      normalizeText(input.zip),
      normalizeText(input.yearBuilt),
      normalizeText(input.propertyType),
      normalizeText(input.representationSide),
      normalizeText(input.escrowCompany),
      normalizeText(input.nextStep),
      parseDateString(input.nextStepDate),
      price,
      input.metadata ? JSON.stringify(input.metadata) : null,
      projectId,
    ]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  if (Array.isArray(input.documents)) {
    await pool.query(
      `UPDATE public.project_documents
       SET deleted_at = now(), updated_at = now()
       WHERE project_id = $1::bigint
         AND deleted_at IS NULL`,
      [projectId]
    );
    for (const d of input.documents) {
      const name = normalizeText(d.name);
      if (!name) continue;
      const statusDb = DOC_STATUS_UI_TO_DB[d.status ?? "Pending"] ?? "pending";
      await pool.query(
        `INSERT INTO public.project_documents (
           project_id, display_name, status, custom_status_text, required, source_rule_id, source_rule_action_id, created_at, updated_at
         ) VALUES (
           $1::bigint, $2, $3::public.document_status, $4, $5, $6::bigint, $7, now(), now()
         )`,
        [
          projectId,
          name,
          statusDb,
          normalizeText(d.customStatus) || null,
          Boolean(d.required),
          /^\d+$/.test(normalizeText(d.sourceRuleId)) ? normalizeText(d.sourceRuleId) : null,
          normalizeText(d.sourceRuleActionId) || null,
        ]
      );
    }
  }
  const updated = await getProjectById(pool, projectId);
  if (!updated) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  return { project: updated };
}

export async function patchProjectStage(
  pool: Pool,
  projectId: string,
  stage: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const stageDb = mapStageToDb(stage);
  if (!stageDb) {
    return { error: { status: 400, code: "PROJECT_STAGE_INVALID", message: "Project stage is invalid." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.projects
     SET stage = $1::public.project_stage, updated_at = now()
     WHERE id = $2::bigint AND deleted_at IS NULL`,
    [stageDb, projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  return { project };
}

export async function patchProjectNextStep(
  pool: Pool,
  projectId: string,
  nextStep: string,
  nextStepDate: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const step = normalizeText(nextStep);
  if (!step) {
    return { error: { status: 400, code: "PROJECT_NEXT_STEP_REQUIRED", message: "Next step text is required." } };
  }
  const date = parseDateString(nextStepDate);
  if (!date) {
    return { error: { status: 400, code: "PROJECT_NEXT_STEP_DATE_INVALID", message: "Next step date is invalid." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.projects
     SET next_step_text = $1, next_step_date = $2::date, updated_at = now()
     WHERE id = $3::bigint AND deleted_at IS NULL`,
    [step, date, projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  return { project };
}

export async function patchProjectDocumentStatus(
  pool: Pool,
  projectId: string,
  documentId: string,
  status: string,
  customStatus?: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(documentId)) {
    return { error: { status: 404, code: "PROJECT_DOCUMENT_NOT_FOUND", message: "Project document not found." } };
  }
  const statusDb = DOC_STATUS_UI_TO_DB[status as DocumentStatusUi];
  if (!statusDb) {
    return { error: { status: 400, code: "PROJECT_DOCUMENT_STATUS_INVALID", message: "Document status is invalid." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.project_documents
     SET status = $1::public.document_status,
         custom_status_text = CASE WHEN $1::public.document_status = 'other'::public.document_status THEN $2 ELSE NULL END,
         updated_at = now()
     WHERE id = $3::bigint
       AND project_id = $4::bigint
       AND deleted_at IS NULL`,
    [statusDb, normalizeText(customStatus) || null, documentId, projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_DOCUMENT_NOT_FOUND", message: "Project document not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  return { project };
}

export async function createProjectDocument(
  pool: Pool,
  projectId: string,
  name: string,
  createdByUserId: string | null
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const trimmed = normalizeText(name);
  if (!trimmed) {
    return { error: { status: 400, code: "PROJECT_DOCUMENT_NAME_REQUIRED", message: "Document name is required." } };
  }
  await pool.query(
    `INSERT INTO public.project_documents (
       project_id, display_name, status, custom_status_text, required, created_by_user_id, created_at, updated_at
     ) VALUES (
       $1::bigint, $2, 'pending'::public.document_status, NULL, false, $3::bigint, now(), now()
     )`,
    [projectId, trimmed, createdByUserId && /^\d+$/.test(createdByUserId) ? createdByUserId : null]
  );
  const project = await getProjectById(pool, projectId);
  if (!project) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  return { project };
}

export async function deleteProjectDocument(
  pool: Pool,
  projectId: string,
  documentId: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(documentId)) {
    return { error: { status: 404, code: "PROJECT_DOCUMENT_NOT_FOUND", message: "Project document not found." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.project_documents
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1::bigint
       AND project_id = $2::bigint
       AND deleted_at IS NULL`,
    [documentId, projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_DOCUMENT_NOT_FOUND", message: "Project document not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  return { project };
}

export async function deleteProject(
  pool: Pool,
  projectId: string
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.projects
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1::bigint
       AND deleted_at IS NULL`,
    [projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  return { ok: true };
}

export async function createProjectTask(
  pool: Pool,
  projectId: string,
  input: { title: string; stage: string; status?: string; dueDate?: string }
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const title = normalizeText(input.title);
  if (!title) {
    return { error: { status: 400, code: "PROJECT_TASK_TITLE_REQUIRED", message: "Task title is required." } };
  }
  const stageDb = mapStageToDb(input.stage);
  if (!stageDb) {
    return { error: { status: 400, code: "PROJECT_STAGE_INVALID", message: "Project stage is invalid." } };
  }
  const statusRaw = normalizeText(input.status);
  const statusDb =
    statusRaw === "In Progress" ? "in_progress" :
      statusRaw === "Complete" ? "complete" :
        "pending";
  await pool.query(
    `INSERT INTO public.project_tasks (
       project_id, title, stage, status, due_date, completed_at, created_at, updated_at
     ) VALUES (
       $1::bigint, $2, $3::public.project_stage, $4::public.task_status, $5::date,
       CASE WHEN $4::public.task_status = 'complete'::public.task_status THEN now() ELSE NULL END,
       now(), now()
     )`,
    [projectId, title, stageDb, statusDb, parseDateString(input.dueDate)]
  );
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function patchProjectTaskStatus(
  pool: Pool,
  projectId: string,
  taskId: string,
  status: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(taskId)) {
    return { error: { status: 404, code: "PROJECT_TASK_NOT_FOUND", message: "Project task not found." } };
  }
  const statusDb =
    status === "In Progress" ? "in_progress" :
      status === "Complete" ? "complete" :
        status === "Pending" ? "pending" :
          null;
  if (!statusDb) {
    return { error: { status: 400, code: "PROJECT_TASK_STATUS_INVALID", message: "Task status is invalid." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.project_tasks
     SET status = $1::public.task_status,
         completed_at = CASE WHEN $1::public.task_status = 'complete'::public.task_status THEN now() ELSE NULL END,
         updated_at = now()
     WHERE id = $2::bigint
       AND project_id = $3::bigint`,
    [statusDb, taskId, projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_TASK_NOT_FOUND", message: "Project task not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function patchProjectTasksBulkStatus(
  pool: Pool,
  projectId: string,
  taskIds: string[],
  status: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const cleanTaskIds = [...new Set(taskIds.filter((id) => /^\d+$/.test(id)))];
  if (cleanTaskIds.length === 0) {
    return { error: { status: 400, code: "PROJECT_TASK_IDS_REQUIRED", message: "At least one task id is required." } };
  }
  const statusDb =
    status === "In Progress" ? "in_progress" :
      status === "Complete" ? "complete" :
        status === "Pending" ? "pending" :
          null;
  if (!statusDb) {
    return { error: { status: 400, code: "PROJECT_TASK_STATUS_INVALID", message: "Task status is invalid." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.project_tasks
     SET status = $1::public.task_status,
         completed_at = CASE WHEN $1::public.task_status = 'complete'::public.task_status THEN now() ELSE NULL END,
         updated_at = now()
     WHERE project_id = $2::bigint
       AND id = ANY($3::bigint[])`,
    [statusDb, projectId, cleanTaskIds.map((id) => Number(id))]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_TASK_NOT_FOUND", message: "Project task not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function createProjectDeadline(
  pool: Pool,
  projectId: string,
  input: { title: string; date: string; type?: string }
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const title = normalizeText(input.title);
  const dueDate = parseDateString(input.date);
  if (!title || !dueDate) {
    return { error: { status: 400, code: "PROJECT_DEADLINE_INVALID", message: "Deadline title and date are required." } };
  }
  const type = normalizeText(input.type) === "reminder" ? "reminder" : "deadline";
  await pool.query(
    `INSERT INTO public.project_deadlines (
       project_id, title, due_date, type, is_completed, created_at, updated_at
     ) VALUES (
       $1::bigint, $2, $3::date, $4::public.deadline_type, false, now(), now()
     )`,
    [projectId, title, dueDate, type]
  );
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function createProjectEmail(
  pool: Pool,
  config: AppConfig,
  projectId: string,
  input: { to: string; subject: string; body: string; from?: string },
  sentByUserId: string | null
): Promise<
  | { project: ProjectDetailApi; emailSendFailed?: boolean; emailSendError?: string }
  | { error: ServiceError }
> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const to = normalizeText(input.to);
  const subject = normalizeText(input.subject);
  const body = normalizeText(input.body);
  if (!to || !subject || !body) {
    return { error: { status: 400, code: "PROJECT_EMAIL_INVALID", message: "To, subject, and body are required." } };
  }
  const smtp = await getSmtpSettings(pool);
  if (!smtp.host.trim()) {
    return {
      error: {
        status: 422,
        code: "SMTP_NOT_CONFIGURED",
        message: "Outbound email is not configured. Add SMTP settings under Settings → Email (SMTP).",
      },
    };
  }
  if (smtp.authUser.trim().length > 0 && !smtp.hasPassword) {
    return {
      error: {
        status: 422,
        code: "SMTP_PASSWORD_MISSING",
        message: "SMTP username is set but no password is saved. Update SMTP settings.",
      },
    };
  }
  const fromAddress =
    smtp.fromEmail.trim() ||
    smtp.authUser.trim() ||
    normalizeText(input.from) ||
    "noreply@invalid";
  const sentBy =
    sentByUserId && /^\d+$/.test(sentByUserId) ? sentByUserId : null;
  const ins = await pool.query<{ id: string }>(
    `INSERT INTO public.emails (
       project_id, client_id, template_id, direction, subject, body, from_address, to_address,
       cc, bcc, gmail_message_id, sent_by_user_id, sent_at, delivery_status, delivery_error, smtp_message_id,
       created_at, updated_at
     ) VALUES (
       $1::bigint, NULL, NULL, 'outbound'::public.email_direction, $2, $3, $4, $5,
       NULL, NULL, NULL, $6::bigint, NULL, 'pending'::public.email_delivery_status, NULL, NULL,
       now(), now()
     )
     RETURNING id::text`,
    [projectId, subject, body, fromAddress, to, sentBy]
  );
  const emailId = ins.rows[0]?.id;
  if (!emailId) {
    return { error: { status: 500, code: "PROJECT_EMAIL_INSERT_FAILED", message: "Could not create email row." } };
  }
  try {
    const htmlBody = body.includes("<") ? body : `<p>${body.replace(/\n/g, "<br/>")}</p>`;
    const { messageId } = await sendMailWithStoredSettings(pool, config, {
      to,
      subject,
      text: body,
      html: htmlBody,
    });
    await pool.query(
      `UPDATE public.emails SET
         delivery_status = 'sent'::public.email_delivery_status,
         sent_at = now(),
         smtp_message_id = $2,
         delivery_error = NULL,
         updated_at = now()
       WHERE id = $1::bigint`,
      [emailId, messageId || null]
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await pool.query(
      `UPDATE public.emails SET
         delivery_status = 'failed'::public.email_delivery_status,
         delivery_error = $2,
         updated_at = now()
       WHERE id = $1::bigint`,
      [emailId, msg.slice(0, 2000)]
    );
    const project = await getProjectById(pool, projectId);
    if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
    return { project, emailSendFailed: true, emailSendError: msg };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function createProjectNote(
  pool: Pool,
  projectId: string,
  body: string,
  authorUserId: string | null
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const trimmed = normalizeText(body);
  if (!trimmed) {
    return { error: { status: 400, code: "PROJECT_NOTE_BODY_REQUIRED", message: "Note text is required." } };
  }
  await pool.query(
    `INSERT INTO public.project_notes (
       project_id, author_user_id, body, created_at, updated_at
     ) VALUES (
       $1::bigint, $2::bigint, $3, now(), now()
     )`,
    [projectId, authorUserId && /^\d+$/.test(authorUserId) ? authorUserId : null, trimmed]
  );
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function createProjectDocumentNote(
  pool: Pool,
  projectId: string,
  documentId: string,
  body: string,
  authorUserId: string | null
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(documentId)) {
    return { error: { status: 404, code: "PROJECT_DOCUMENT_NOT_FOUND", message: "Project document not found." } };
  }
  const trimmed = normalizeText(body);
  if (!trimmed) {
    return { error: { status: 400, code: "PROJECT_DOCUMENT_NOTE_BODY_REQUIRED", message: "Note text is required." } };
  }
  const existing = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok
     FROM public.project_documents
     WHERE id = $1::bigint
       AND project_id = $2::bigint
       AND deleted_at IS NULL
     LIMIT 1`,
    [documentId, projectId]
  );
  if (existing.rows.length === 0) {
    return { error: { status: 404, code: "PROJECT_DOCUMENT_NOT_FOUND", message: "Project document not found." } };
  }
  await pool.query(
    `INSERT INTO public.project_document_notes (
       project_document_id, author_user_id, body, created_at, updated_at
     ) VALUES (
       $1::bigint, $2::bigint, $3, now(), now()
     )`,
    [documentId, authorUserId && /^\d+$/.test(authorUserId) ? authorUserId : null, trimmed]
  );
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function setProjectAssignments(
  pool: Pool,
  projectId: string,
  userIds: string[],
  assignedByUserId: string | null
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const normalized = [...new Set(userIds.filter((id) => /^\d+$/.test(id)))];

  const existingProject = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok
     FROM public.projects
     WHERE id = $1::bigint
       AND deleted_at IS NULL
     LIMIT 1`,
    [projectId]
  );
  if (existingProject.rows.length === 0) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }

  if (normalized.length > 0) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id::text
       FROM public.users
       WHERE deleted_at IS NULL
         AND status = 'active'::public.user_status
         AND id = ANY($1::bigint[])`,
      [normalized.map((v) => Number(v))]
    );
    if (rows.length !== normalized.length) {
      return { error: { status: 400, code: "PROJECT_ASSIGNMENT_INVALID_USER", message: "One or more assignees are invalid." } };
    }
  }

  await pool.query(`DELETE FROM public.project_assignments WHERE project_id = $1::bigint`, [projectId]);
  for (const uid of normalized) {
    await pool.query(
      `INSERT INTO public.project_assignments (
         project_id, user_id, assigned_by_user_id, created_at, updated_at
       ) VALUES (
         $1::bigint, $2::bigint, $3::bigint, now(), now()
       )
       ON CONFLICT (project_id, user_id) DO UPDATE
       SET assigned_by_user_id = EXCLUDED.assigned_by_user_id,
           updated_at = now()`,
      [projectId, uid, assignedByUserId && /^\d+$/.test(assignedByUserId) ? assignedByUserId : null]
    );
  }
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function listAssignableProjectUsers(
  pool: Pool
): Promise<Array<{ id: string; name: string; email: string; designation?: string | null }>> {
  const { rows } = await pool.query<{
    id: string;
    name: string;
    email: string;
    designation: string | null;
  }>(
    `SELECT id::text, name, email, designation
     FROM public.users
     WHERE deleted_at IS NULL
       AND status = 'active'::public.user_status
     ORDER BY name ASC
     LIMIT 500`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    designation: r.designation,
  }));
}
