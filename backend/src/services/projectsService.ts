import path from "node:path";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import type { AuthUser } from "../middleware/auth.js";
import { getSmtpSettings, sendMailWithStoredSettings } from "./smtpSettingsService.js";
import { absolutePathForStorageKey } from "./storedFilesService.js";
import { formatEmailAddressList, parseEmailAddressList } from "../utils/parseEmailAddressList.js";
import {
  ensureInitialCompassTasksSeeded,
  isContractAcceptedInMetadata,
  seedCompassProjectTasks,
} from "./compassTaskSeedService.js";

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
  /** Vault `esign_documents.id` when this checklist row is wired for DocuSign from a library layout. */
  esignDocumentId?: string;
};

export type ProjectDocumentNoteApi = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
};

export type ProjectTaskNoteApi = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
};

export type ProjectTimelineNoteApi = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
};

export type ProjectTaskTypeUi = "general" | "email";

export type ProjectTaskApi = {
  id: string;
  title: string;
  stage: ProjectStageUi;
  status: TaskStatusUi;
  dueDate: string;
  completedDate?: string;
  taskType: ProjectTaskTypeUi;
  emailTemplateId?: string;
  recipientEmail?: string;
  taskSection?: string;
  sortOrder?: number;
  instructionUrl?: string;
  notes: ProjectTaskNoteApi[];
};

const TASK_TYPE_DB_TO_UI: Record<string, ProjectTaskTypeUi> = {
  general: "general",
  email: "email",
};

function mapTaskTypeToDb(type: string): "general" | "email" | null {
  if (type === "email") return "email";
  if (type === "general") return "general";
  return null;
}

export type ProjectEmailAttachmentApi = {
  id: string;
  storedFileId: string;
  name: string;
  sizeBytes: number;
};

export type ProjectEmailApi = {
  id: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  date: string;
  body: string;
  direction: "inbound" | "outbound";
  deliveryStatus: "pending" | "sent" | "failed";
  deliveryError?: string | null;
  attachments?: ProjectEmailAttachmentApi[];
};

export type ProjectNoteApi = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
};

export type ProjectDeadlineApi = {
  id: string;
  title: string;
  date: string;
  type: string;
  formManaged: boolean;
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
  timelineNotes: Record<string, ProjectTimelineNoteApi[]>;
  metadata?: Record<string, unknown>;
};

export type CalendarEventApi = {
  id: string;
  sourceId: string;
  projectId: string;
  projectName: string;
  propertyAddress: string;
  clientName: string;
  clientEmail: string;
  title: string;
  date: string;
  kind: "task" | "deadline" | "reminder" | "meeting" | "close";
  source: "project_tasks" | "project_deadlines" | "reminder_drafts" | "projects";
  isOverdue: boolean;
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
    /** Pool `stored_files.id` values to attach to this checklist row (rule-driven PDFs). */
    attachedFileIds?: string[];
    /** Vault `esign_documents.id` for DocuSign send (optional; resolved from vault layout). */
    esignDocumentId?: string;
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

/** Sentinel values a timeline milestone can hold instead of a date (mirrors the frontend). */
const TIMELINE_STATUS_SENTINELS = new Set(["__COMPLETED__", "__NA__", "__WAIVED__"]);

/** Weekend/holiday deadlines move forward to the following business day (Sat/Sun → Mon). */
function adjustDeadlineOffWeekend(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const d = new Date(year, month, day);
  if (Number.isNaN(d.getTime())) return iso;
  const dow = d.getDay();
  if (dow === 6) d.setDate(d.getDate() + 2);
  else if (dow === 0) d.setDate(d.getDate() + 1);
  else return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Contract / Acceptance are fixed calendar dates and must not be weekend-bumped. */
const FIXED_CALENDAR_DEADLINE_TITLES = new Set(["Contract Date", "Acceptance Date"]);

function maybeAdjustDeadlineDate(iso: string, title: string): string {
  if (FIXED_CALENDAR_DEADLINE_TITLES.has(title)) return iso;
  return adjustDeadlineOffWeekend(iso);
}

/** Titles seeded from Add Project → Timeline / COP / SPRP; removed on re-sync so custom deadlines keep other titles. */
const MANAGED_FORM_DEADLINE_TITLES = [
  "Contract Date",
  "Acceptance Date",
  "Preapproval",
  "Verification of Funds",
  "EMD to Escrow",
  "Seller Disclosures to Buyer",
  "Investigation Contingency Removal",
  "Insurance Contingency Removal",
  "Review of Seller Docs Contingency Removal",
  "Review of Prelim Contingency Removal",
  "Review of Comm Int Discl Contingency Removal",
  "Appraisal Contingency Removal",
  "Loan Contingency Removal",
  "Estimated COE",
  "COP — Into Contract",
  "COP — COE",
  "SPRP — Into Contract",
  "SPRP — COE",
] as const;

function collectDeadlineRowsFromProjectMetadata(metadata: unknown): { title: string; dueDate: string }[] {
  const out: { title: string; dueDate: string }[] = [];
  if (!metadata || typeof metadata !== "object") return out;
  const md = metadata as Record<string, unknown>;

  const pushDate = (raw: unknown, title: string) => {
    if (typeof raw !== "string") return;
    const d = parseDateString(raw);
    if (d) out.push({ title, dueDate: maybeAdjustDeadlineDate(d, title) });
  };

  const timeline = md.timeline;
  if (timeline && typeof timeline === "object") {
    const tl = timeline as Record<string, unknown>;
    pushDate(tl.contractDate, "Contract Date");
    pushDate(tl.acceptanceDate, "Acceptance Date");
    pushDate(tl.preapproval, "Preapproval");
    pushDate(tl.verificationOfFunds, "Verification of Funds");
    pushDate(tl.emdToEscrow, "EMD to Escrow");
    pushDate(tl.sellerDisclosuresToBuyer, "Seller Disclosures to Buyer");
    pushDate(tl.investigationContingency, "Investigation Contingency Removal");
    pushDate(tl.insuranceContingency, "Insurance Contingency Removal");
    pushDate(tl.reviewSellerDocs, "Review of Seller Docs Contingency Removal");
    pushDate(tl.reviewPrelim, "Review of Prelim Contingency Removal");
    pushDate(tl.reviewCommIntDiscl, "Review of Comm Int Discl Contingency Removal");
    pushDate(tl.appraisalContingency, "Appraisal Contingency Removal");
    pushDate(tl.loanContingency, "Loan Contingency Removal");
    pushDate(tl.estimatedCOE, "Estimated COE");
  }

  if (md.showCOP === true && md.cop && typeof md.cop === "object") {
    const c = md.cop as Record<string, unknown>;
    pushDate(c.intoContract, "COP — Into Contract");
    pushDate(c.coe, "COP — COE");
  }
  if (md.showSPRP === true && md.sprp && typeof md.sprp === "object") {
    const s = md.sprp as Record<string, unknown>;
    pushDate(s.intoContract, "SPRP — Into Contract");
    pushDate(s.coe, "SPRP — COE");
  }

  const customTimeline = md.customTimeline;
  if (Array.isArray(customTimeline)) {
    for (const entry of customTimeline) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      if (row.kind !== "date") continue;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      if (!title) continue;
      pushDate(row.value, title);
    }
  }

  return out;
}

function collectCustomTimelineDateTitles(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const md = metadata as Record<string, unknown>;
  const customTimeline = md.customTimeline;
  if (!Array.isArray(customTimeline)) return [];
  const titles: string[] = [];
  for (const entry of customTimeline) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (row.kind !== "date") continue;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (title) titles.push(title);
  }
  return titles;
}

const FORM_DEADLINE_TITLE_TO_FIELD: Record<
  string,
  { scope: "timeline" | "cop" | "sprp"; field: string }
> = {
  "Contract Date": { scope: "timeline", field: "contractDate" },
  "Acceptance Date": { scope: "timeline", field: "acceptanceDate" },
  "Preapproval": { scope: "timeline", field: "preapproval" },
  "Verification of Funds": { scope: "timeline", field: "verificationOfFunds" },
  "EMD to Escrow": { scope: "timeline", field: "emdToEscrow" },
  "Seller Disclosures to Buyer": { scope: "timeline", field: "sellerDisclosuresToBuyer" },
  "Investigation Contingency Removal": { scope: "timeline", field: "investigationContingency" },
  "Insurance Contingency Removal": { scope: "timeline", field: "insuranceContingency" },
  "Review of Seller Docs Contingency Removal": { scope: "timeline", field: "reviewSellerDocs" },
  "Review of Prelim Contingency Removal": { scope: "timeline", field: "reviewPrelim" },
  "Review of Comm Int Discl Contingency Removal": { scope: "timeline", field: "reviewCommIntDiscl" },
  "Appraisal Contingency Removal": { scope: "timeline", field: "appraisalContingency" },
  "Loan Contingency Removal": { scope: "timeline", field: "loanContingency" },
  "Estimated COE": { scope: "timeline", field: "estimatedCOE" },
  "COP — Into Contract": { scope: "cop", field: "intoContract" },
  "COP — COE": { scope: "cop", field: "coe" },
  "SPRP — Into Contract": { scope: "sprp", field: "intoContract" },
  "SPRP — COE": { scope: "sprp", field: "coe" },
};

function isFormManagedDeadlineTitle(title: string): boolean {
  return (MANAGED_FORM_DEADLINE_TITLES as readonly string[]).includes(title);
}

const FORM_TIMELINE_FIELD_KEY_TO_TITLE: Record<string, string> = {
  contractDate: "Contract Date",
  acceptanceDate: "Acceptance Date",
  preapproval: "Preapproval",
  verificationOfFunds: "Verification of Funds",
  emdToEscrow: "EMD to Escrow",
  sellerDisclosuresToBuyer: "Seller Disclosures to Buyer",
  investigationContingency: "Investigation Contingency Removal",
  insuranceContingency: "Insurance Contingency Removal",
  reviewSellerDocs: "Review of Seller Docs Contingency Removal",
  reviewPrelim: "Review of Prelim Contingency Removal",
  reviewCommIntDiscl: "Review of Comm Int Discl Contingency Removal",
  appraisalContingency: "Appraisal Contingency Removal",
  loanContingency: "Loan Contingency Removal",
  estimatedCOE: "Estimated COE",
  copIntoContract: "COP — Into Contract",
  copCoe: "COP — COE",
  sprpIntoContract: "SPRP — Into Contract",
  sprpCoe: "SPRP — COE",
};

function isValidTimelineNoteFieldKey(fieldKey: string): boolean {
  const key = fieldKey.trim();
  if (FORM_TIMELINE_FIELD_KEY_TO_TITLE[key]) return true;
  if (/^custom:[a-zA-Z0-9_-]+$/.test(key)) return true;
  if (/^deadline:\d+$/.test(key)) return true;
  return false;
}

function applyFormDeadlineDateToMetadata(
  metadata: unknown,
  title: string,
  dateValue: string
): Record<string, unknown> {
  const mapping = FORM_DEADLINE_TITLE_TO_FIELD[title];
  const md =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  if (!mapping) return md;

  let storedDate = dateValue.trim();
  if (storedDate) {
    const parsed = parseDateString(storedDate);
    if (parsed) storedDate = maybeAdjustDeadlineDate(parsed, title);
  }

  if (mapping.scope === "timeline") {
    const timeline =
      md.timeline && typeof md.timeline === "object" && !Array.isArray(md.timeline)
        ? { ...(md.timeline as Record<string, unknown>) }
        : {};
    timeline[mapping.field] = storedDate;
    return { ...md, timeline };
  }
  if (mapping.scope === "cop") {
    const cop =
      md.cop && typeof md.cop === "object" && !Array.isArray(md.cop)
        ? { ...(md.cop as Record<string, unknown>) }
        : {};
    cop[mapping.field] = storedDate;
    return { ...md, showCOP: true, cop };
  }
  const sprp =
    md.sprp && typeof md.sprp === "object" && !Array.isArray(md.sprp)
      ? { ...(md.sprp as Record<string, unknown>) }
      : {};
  sprp[mapping.field] = storedDate;
  return { ...md, showSPRP: true, sprp };
}

async function loadProjectMetadata(pool: Pool, projectId: string): Promise<unknown | null> {
  const { rows } = await pool.query<{ metadata_json: unknown }>(
    `SELECT metadata_json FROM public.projects WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
    [projectId]
  );
  return rows[0]?.metadata_json ?? null;
}

async function saveProjectMetadataAndSyncDeadlines(
  pool: Pool,
  projectId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await pool.query(
    `UPDATE public.projects SET metadata_json = $1::jsonb, updated_at = now() WHERE id = $2::bigint AND deleted_at IS NULL`,
    [JSON.stringify(metadata), projectId]
  );
  await syncProjectDeadlinesFromFormMetadata(pool, projectId, metadata);
}

/** Replaces form-managed and metadata custom timeline deadline rows; leaves other ad-hoc deadlines intact. */
async function syncProjectDeadlinesFromFormMetadata(
  pool: Pool,
  projectId: string,
  metadata: unknown
): Promise<void> {
  const customTitles = collectCustomTimelineDateTitles(metadata);
  await pool.query(
    `DELETE FROM public.project_deadlines
     WHERE project_id = $1::bigint
       AND title = ANY($2::text[])`,
    [projectId, [...MANAGED_FORM_DEADLINE_TITLES]]
  );
  if (customTitles.length > 0) {
    await pool.query(
      `DELETE FROM public.project_deadlines
       WHERE project_id = $1::bigint
         AND title = ANY($2::text[])
         AND NOT (title = ANY($3::text[]))`,
      [projectId, customTitles, [...MANAGED_FORM_DEADLINE_TITLES]]
    );
  }
  const rows = collectDeadlineRowsFromProjectMetadata(metadata);
  for (const r of rows) {
    await pool.query(
      `INSERT INTO public.project_deadlines (
         project_id, title, due_date, type, is_completed, created_at, updated_at
       ) VALUES (
         $1::bigint, $2, $3::date, 'deadline'::public.deadline_type, false, now(), now()
       )`,
      [projectId, r.title, r.dueDate]
    );
  }
}

function strMeta(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function listingContractAccepted(metadata: Record<string, unknown> | undefined): boolean {
  return metadata?.contractAccepted === true;
}

/** Purchase price is post-contract for listings; always required for buyer files. */
function requiresPurchasePrice(type: string, metadata: Record<string, unknown> | undefined): boolean {
  if (type === "Listing") return listingContractAccepted(metadata);
  return true;
}

function validateTimelineMetadata(
  type: string,
  metadata: Record<string, unknown> | undefined,
): ServiceError | null {
  const md = metadata ?? {};
  const isListing = type === "Listing";
  const contractAccepted = listingContractAccepted(md);
  const timelineApplies = !isListing || contractAccepted;
  if (!timelineApplies) return null;

  const tx =
    md.transaction && typeof md.transaction === "object" && !Array.isArray(md.transaction)
      ? (md.transaction as Record<string, unknown>)
      : null;
  const prop =
    md.property && typeof md.property === "object" && !Array.isArray(md.property)
      ? (md.property as Record<string, unknown>)
      : null;
  const tl =
    md.timeline && typeof md.timeline === "object" && !Array.isArray(md.timeline)
      ? (md.timeline as Record<string, unknown>)
      : {};

  const isAllCash = strMeta(tx?.loanType) === "All Cash";
  const hoaYes = strMeta(prop?.hoa) === "yes";

  const required: Array<{ key: string; title: string }> = [
    { key: "contractDate", title: "Contract Date" },
    { key: "acceptanceDate", title: "Acceptance Date" },
  ];
  if (!isListing) {
    required.push({ key: "estimatedCOE", title: "Estimated COE" });
  }
  if (!isAllCash) {
    required.push({ key: "preapproval", title: "Preapproval" });
    required.push({ key: "loanContingency", title: "Loan Contingency Removal" });
  }
  if (hoaYes) {
    required.push({ key: "reviewCommIntDiscl", title: "Review of Comm Int Discl Contingency Removal" });
  }

  const missing = required.filter(({ key }) => !strMeta(tl[key]));
  if (missing.length === 0) return null;
  return {
    status: 400,
    code: "PROJECT_TIMELINE_REQUIRED",
    message: `Missing required timeline fields: ${missing.map((m) => m.title).join(", ")}.`,
  };
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
  if (!normalizeText(input.nextStep)) {
    return { status: 400, code: "PROJECT_NEXT_STEP_REQUIRED", message: "Next step is required." };
  }
  if (!parseDateString(input.nextStepDate)) {
    return { status: 400, code: "PROJECT_NEXT_STEP_DATE_REQUIRED", message: "Next step date is required." };
  }
  if (requiresPurchasePrice(input.type, input.metadata) && parseMoneyToNumber(input.listPrice) == null) {
    return { status: 400, code: "PROJECT_PRICE_REQUIRED", message: "Purchase price is required and must be a valid number." };
  }
  if (input.stage && !mapStageToDb(input.stage)) {
    return { status: 400, code: "PROJECT_STAGE_INVALID", message: "Project stage is invalid." };
  }
  const timelineValidation = validateTimelineMetadata(input.type, input.metadata);
  if (timelineValidation) return timelineValidation;
  return null;
}

/** Contact link name, then metadata.escrow from the New Project form. */
const ESCROW_OFFICER_NAME_SQL = `COALESCE(
  NULLIF(trim(co.full_name), ''),
  NULLIF(trim(p.metadata_json->'escrow'->>'name'), ''),
  NULLIF(trim(p.metadata_json->'escrow'->>'preferredName'), '')
)`;

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
       ${ESCROW_OFFICER_NAME_SQL} AS escrow_officer_name,
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
     JOIN public.contacts c ON c.id = p.client_id
     LEFT JOIN public.transaction_party_contacts co ON co.id = p.escrow_officer_contact_id
     LEFT JOIN public.project_documents pd ON pd.project_id = p.id AND pd.deleted_at IS NULL
     LEFT JOIN public.project_tasks pt ON pt.project_id = p.id
     LEFT JOIN public.project_deadlines pdl ON pdl.project_id = p.id
     LEFT JOIN public.stored_files sf ON sf.project_id = p.id
     WHERE ${where.join(" AND ")}
     GROUP BY p.id, c.name, co.full_name, p.metadata_json
     ORDER BY p.created_at DESC
     LIMIT 1000`,
    params
  );
  return rows.map(mapListRow);
}

function classifyCalendarKind(title: string, fallback: CalendarEventApi["kind"]): CalendarEventApi["kind"] {
  const t = title.toLowerCase();
  if (t.includes("close of escrow") || t.includes(" — coe") || t === "coe") return "close";
  if (t.includes("meeting") || t.includes("appointment") || t.includes("inspection")) return "meeting";
  return fallback;
}

function buildCalendarFilters(
  user: AuthUser,
  hasGlobalAccess: boolean,
  projectId: string,
  fromDate: string | null,
  toDate: string | null
): { whereSql: string; params: unknown[] } {
  const params: unknown[] = [];
  const where: string[] = ["p.deleted_at IS NULL"];
  if (!hasGlobalAccess) {
    params.push(user.id);
    where.push(`EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.project_id = p.id AND pa.user_id = $${params.length}::bigint)`);
  }
  if (projectId && /^\d+$/.test(projectId)) {
    params.push(projectId);
    where.push(`p.id = $${params.length}::bigint`);
  }
  if (fromDate) {
    params.push(fromDate);
    where.push(`ev.ev_date >= $${params.length}::date`);
  }
  if (toDate) {
    params.push(toDate);
    where.push(`ev.ev_date <= $${params.length}::date`);
  }
  return { whereSql: where.join(" AND "), params };
}

export async function listCalendarEvents(
  pool: Pool,
  input: { user: AuthUser; from?: string; to?: string; projectId?: string; kinds?: string[] }
): Promise<CalendarEventApi[]> {
  const fromDate = parseDateString(input.from);
  const toDate = parseDateString(input.to);
  const projectId = normalizeText(input.projectId);
  const hasGlobalAccess =
    input.user.role === "super_admin" ||
    input.user.permissions.includes("project_access.global") ||
    input.user.permissions.includes("projects.view_all");
  const allowedKinds = new Set((input.kinds ?? []).map((k) => normalizeText(k).toLowerCase()).filter(Boolean));
  const { whereSql, params } = buildCalendarFilters(input.user, hasGlobalAccess, projectId, fromDate, toDate);

  const nextStepRows = await pool.query<{
    id: string;
    project_id: string;
    project_name: string;
    property_address: string;
    client_name: string;
    client_email: string;
    title: string;
    event_date: string;
  }>(
    `SELECT
       p.id::text AS id,
       p.id::text AS project_id,
       p.name AS project_name,
       p.property_address,
       c.name AS client_name,
       c.email AS client_email,
       COALESCE(NULLIF(btrim(p.next_step_text), ''), 'Next step') AS title,
       p.next_step_date::text AS event_date
     FROM public.projects p
     JOIN public.contacts c ON c.id = p.client_id
     CROSS JOIN LATERAL (SELECT p.next_step_date AS ev_date) ev
     WHERE ${whereSql}
       AND p.next_step_date IS NOT NULL`,
    params
  );

  const deadlineRows = await pool.query<{
    id: string;
    project_id: string;
    project_name: string;
    property_address: string;
    client_name: string;
    client_email: string;
    title: string;
    event_date: string;
    deadline_type: string;
  }>(
    `SELECT
       pdl.id::text AS id,
       p.id::text AS project_id,
       p.name AS project_name,
       p.property_address,
       c.name AS client_name,
       c.email AS client_email,
       pdl.title,
       pdl.due_date::text AS event_date,
       pdl.type::text AS deadline_type
     FROM public.project_deadlines pdl
     JOIN public.projects p ON p.id = pdl.project_id
     JOIN public.contacts c ON c.id = p.client_id
     CROSS JOIN LATERAL (SELECT pdl.due_date AS ev_date) ev
     WHERE ${whereSql}
       AND pdl.is_completed = false`,
    params
  );

  const draftRows = await pool.query<{
    id: string;
    project_id: string;
    project_name: string;
    property_address: string;
    client_name: string;
    client_email: string;
    title: string;
    event_date: string;
  }>(
    `SELECT
       rd.id::text AS id,
       p.id::text AS project_id,
       p.name AS project_name,
       p.property_address,
       c.name AS client_name,
       c.email AS client_email,
       COALESCE(NULLIF(btrim(rd.reminder_type), ''), 'Reminder Draft') AS title,
       COALESCE(pd.due_date::text, rd.created_at::date::text) AS event_date
     FROM public.reminder_drafts rd
     JOIN public.projects p ON p.id = rd.project_id
     JOIN public.contacts c ON c.id = p.client_id
     LEFT JOIN public.project_deadlines pd ON pd.id = rd.project_deadline_id
     CROSS JOIN LATERAL (SELECT COALESCE(pd.due_date, rd.created_at::date) AS ev_date) ev
     WHERE ${whereSql}
       AND rd.status = 'draft'::public.reminder_status`,
    params
  );

  const today = new Date().toISOString().split("T")[0];
  const allEvents: CalendarEventApi[] = [
    ...nextStepRows.rows.map((r) => ({
      id: `next_step:${r.id}`,
      sourceId: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      propertyAddress: r.property_address,
      clientName: r.client_name,
      clientEmail: r.client_email ?? "",
      title: r.title,
      date: r.event_date,
      kind: classifyCalendarKind(r.title, "task"),
      source: "projects" as const,
      isOverdue: r.event_date < today,
    })),
    ...deadlineRows.rows.map((r) => ({
      id: `deadline:${r.id}`,
      sourceId: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      propertyAddress: r.property_address,
      clientName: r.client_name,
      clientEmail: r.client_email ?? "",
      title: r.title,
      date: r.event_date,
      kind: classifyCalendarKind(r.title, r.deadline_type === "reminder" ? "reminder" : "deadline"),
      source: "project_deadlines" as const,
      isOverdue: r.event_date < today,
    })),
    ...draftRows.rows.map((r) => ({
      id: `reminder:${r.id}`,
      sourceId: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      propertyAddress: r.property_address,
      clientName: r.client_name,
      clientEmail: r.client_email ?? "",
      title: r.title,
      date: r.event_date,
      kind: "reminder" as const,
      source: "reminder_drafts" as const,
      isOverdue: r.event_date < today,
    })),
  ];

  const deduped = new Map<string, CalendarEventApi>();
  for (const event of allEvents) {
    const key = `${event.projectId}|${event.date}|${event.kind}|${event.title.toLowerCase().trim()}`;
    if (!deduped.has(key)) deduped.set(key, event);
  }
  let out = Array.from(deduped.values()).sort((a, b) => {
    if (a.date === b.date) return a.title.localeCompare(b.title);
    return a.date.localeCompare(b.date);
  });
  if (allowedKinds.size > 0) out = out.filter((e) => allowedKinds.has(e.kind));
  return out;
}

export async function sendReminderDraft(
  pool: Pool,
  config: AppConfig,
  reminderDraftId: string,
  sentByUserId: string | null
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(reminderDraftId)) {
    return { error: { status: 404, code: "REMINDER_DRAFT_NOT_FOUND", message: "Reminder draft not found." } };
  }
  const row = await pool.query<{
    id: string;
    project_id: string;
    subject: string;
    body: string;
    to_address: string;
    status: string;
  }>(
    `SELECT id::text, project_id::text, subject, body, to_address, status::text
     FROM public.reminder_drafts
     WHERE id = $1::bigint
     LIMIT 1`,
    [reminderDraftId]
  );
  const draft = row.rows[0];
  if (!draft) {
    return { error: { status: 404, code: "REMINDER_DRAFT_NOT_FOUND", message: "Reminder draft not found." } };
  }
  if (draft.status !== "draft") {
    return { error: { status: 409, code: "REMINDER_DRAFT_NOT_DRAFT", message: "Reminder draft is not in draft status." } };
  }
  const sendResult = await createProjectEmail(
    pool,
    config,
    draft.project_id,
    { to: draft.to_address, subject: draft.subject, body: draft.body },
    sentByUserId
  );
  if ("error" in sendResult) return { error: sendResult.error };
  if (sendResult.emailSendFailed) {
    return {
      error: {
        status: 502,
        code: "REMINDER_SEND_FAILED",
        message: sendResult.emailSendError || "Could not send reminder email.",
      },
    };
  }
  await pool.query(
    `UPDATE public.reminder_drafts
     SET status = 'sent'::public.reminder_status,
         sent_by_user_id = $2::bigint,
         sent_at = now(),
         updated_at = now()
     WHERE id = $1::bigint`,
    [reminderDraftId, sentByUserId && /^\d+$/.test(sentByUserId) ? sentByUserId : null]
  );
  return { ok: true };
}

export async function dismissReminderDraft(
  pool: Pool,
  reminderDraftId: string
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(reminderDraftId)) {
    return { error: { status: 404, code: "REMINDER_DRAFT_NOT_FOUND", message: "Reminder draft not found." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.reminder_drafts
     SET status = 'dismissed'::public.reminder_status,
         updated_at = now()
     WHERE id = $1::bigint
       AND status = 'draft'::public.reminder_status`,
    [reminderDraftId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "REMINDER_DRAFT_NOT_FOUND", message: "Reminder draft not found." } };
  }
  return { ok: true };
}

async function getProjectTasks(pool: Pool, projectId: string): Promise<ProjectTaskApi[]> {
  type TaskRow = {
    id: string;
    title: string;
    stage: string;
    status: string;
    due_date: string | null;
    completed_at: Date | null;
    task_type: string;
    email_template_id: string | null;
    recipient_email: string | null;
    task_section?: string | null;
    sort_order?: number;
    instruction_url?: string | null;
  };

  let rows: TaskRow[];
  try {
    const result = await pool.query<TaskRow>(
      `SELECT id::text, title, stage::text, status::text, due_date::text, completed_at,
              task_type::text, email_template_id::text, recipient_email,
              task_section, sort_order, instruction_url
       FROM public.project_tasks
       WHERE project_id = $1::bigint
       ORDER BY sort_order ASC, created_at ASC`,
      [projectId]
    );
    rows = result.rows;
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr?.code !== "42703") throw err;
    const legacy = await pool.query<TaskRow>(
      `SELECT id::text, title, stage::text, status::text, due_date::text, completed_at,
              task_type::text, email_template_id::text, recipient_email
       FROM public.project_tasks
       WHERE project_id = $1::bigint
       ORDER BY created_at ASC`,
      [projectId]
    );
    rows = legacy.rows;
  }
  const noteRows = await pool.query<{
    id: string;
    project_task_id: string;
    body: string;
    created_at: Date;
    updated_at: Date;
    author_name: string | null;
  }>(
    `SELECT
       ptn.id::text,
       ptn.project_task_id::text,
       ptn.body,
       ptn.created_at,
       ptn.updated_at,
       u.name AS author_name
     FROM public.project_task_notes ptn
     LEFT JOIN public.users u ON u.id = ptn.author_user_id
     JOIN public.project_tasks pt ON pt.id = ptn.project_task_id
     WHERE pt.project_id = $1::bigint
     ORDER BY ptn.created_at DESC`,
    [projectId]
  );
  const notesByTaskId = new Map<string, ProjectTaskNoteApi[]>();
  for (const r of noteRows.rows) {
    const list = notesByTaskId.get(r.project_task_id) ?? [];
    const createdAt = r.created_at.toISOString().split("T")[0];
    const updatedAt = r.updated_at.toISOString().split("T")[0];
    list.push({
      id: r.id,
      body: r.body,
      author: r.author_name ?? "Unknown",
      createdAt,
      ...(updatedAt !== createdAt ? { updatedAt } : {}),
    });
    notesByTaskId.set(r.project_task_id, list);
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    stage: STAGE_DB_TO_UI[r.stage] ?? "Listing Prep",
    status: TASK_STATUS_DB_TO_UI[r.status] ?? "Pending",
    dueDate: r.due_date ?? "",
    taskType: TASK_TYPE_DB_TO_UI[r.task_type] ?? "general",
    ...(r.email_template_id ? { emailTemplateId: r.email_template_id } : {}),
    ...(r.recipient_email?.trim() ? { recipientEmail: r.recipient_email.trim() } : {}),
    ...(r.task_section?.trim() ? { taskSection: r.task_section.trim() } : {}),
    ...(r.sort_order != null ? { sortOrder: r.sort_order } : {}),
    ...(r.instruction_url?.trim() ? { instructionUrl: r.instruction_url.trim() } : {}),
    ...(r.completed_at ? { completedDate: r.completed_at.toISOString().split("T")[0] } : {}),
    notes: notesByTaskId.get(r.id) ?? [],
  }));
}

async function getProjectTimelineNotes(
  pool: Pool,
  projectId: string
): Promise<Record<string, ProjectTimelineNoteApi[]>> {
  const { rows } = await pool.query<{
    id: string;
    field_key: string;
    body: string;
    created_at: Date;
    updated_at: Date;
    author_name: string | null;
  }>(
    `SELECT
       ptn.id::text,
       ptn.field_key,
       ptn.body,
       ptn.created_at,
       ptn.updated_at,
       u.name AS author_name
     FROM public.project_timeline_notes ptn
     LEFT JOIN public.users u ON u.id = ptn.author_user_id
     WHERE ptn.project_id = $1::bigint
     ORDER BY ptn.created_at DESC`,
    [projectId]
  );
  const out: Record<string, ProjectTimelineNoteApi[]> = {};
  for (const r of rows) {
    const list = out[r.field_key] ?? [];
    const createdAt = r.created_at.toISOString().split("T")[0];
    const updatedAt = r.updated_at.toISOString().split("T")[0];
    list.push({
      id: r.id,
      body: r.body,
      author: r.author_name ?? "Unknown",
      createdAt,
      ...(updatedAt !== createdAt ? { updatedAt } : {}),
    });
    out[r.field_key] = list;
  }
  return out;
}

async function getProjectDeadlines(pool: Pool, projectId: string): Promise<ProjectDeadlineApi[]> {
  const { rows } = await pool.query<{ id: string; title: string; due_date: string; type: string }>(
    `SELECT id::text, title, due_date::text, type::text
     FROM public.project_deadlines
     WHERE project_id = $1::bigint
     ORDER BY due_date ASC`,
    [projectId]
  );
  const managed = new Set<string>(MANAGED_FORM_DEADLINE_TITLES);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    date: r.due_date,
    type: r.type,
    formManaged: managed.has(r.title),
  }));
}

function mapDeliveryStatus(s: string | null | undefined): "pending" | "sent" | "failed" {
  if (s === "pending" || s === "failed") return s;
  return "sent";
}

export type RecentEmailApi = {
  id: string;
  projectId: string;
  projectName: string;
  propertyAddress: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  direction: "inbound" | "outbound";
  deliveryStatus: "pending" | "sent" | "failed";
  deliveryError?: string | null;
};

/** Recent outbound/inbound emails across all visible projects (same access rules as calendar). */
export async function listRecentProjectEmails(
  pool: Pool,
  config: AppConfig,
  input: { user: AuthUser; limit?: number }
): Promise<RecentEmailApi[]> {
  const rawLimit = input.limit ?? 25;
  const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 25;
  const hasGlobalAccess =
    input.user.role === "super_admin" ||
    input.user.permissions.includes("project_access.global") ||
    input.user.permissions.includes("projects.view_all");
  const params: unknown[] = [config.crmVaultProjectId];
  const where: string[] = ["p.deleted_at IS NULL", `p.id <> $1::bigint`];
  if (!hasGlobalAccess) {
    params.push(input.user.id);
    where.push(
      `EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.project_id = p.id AND pa.user_id = $${params.length}::bigint)`
    );
  }
  params.push(limit);
  const limitParam = params.length;

  const { rows } = await pool.query<{
    id: string;
    project_id: string;
    project_name: string;
    property_address: string;
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
    `SELECT
       e.id::text,
       p.id::text AS project_id,
       p.name AS project_name,
       p.property_address,
       e.subject,
       e.from_address,
       e.to_address,
       e.body,
       e.direction::text,
       e.sent_at,
       e.created_at,
       e.delivery_status::text AS delivery_status,
       e.delivery_error
     FROM public.emails e
     JOIN public.projects p ON p.id = e.project_id
     WHERE ${where.join(" AND ")}
     ORDER BY COALESCE(e.sent_at, e.created_at) DESC
     LIMIT $${limitParam}::int`,
    params
  );

  return rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    projectName: r.project_name,
    propertyAddress: r.property_address,
    subject: r.subject,
    from: r.from_address,
    to: r.to_address,
    body: r.body,
    date: (r.sent_at ?? r.created_at).toISOString().split("T")[0],
    direction: r.direction === "inbound" ? "inbound" : "outbound",
    deliveryStatus: mapDeliveryStatus(r.delivery_status),
    ...(r.delivery_error?.trim() ? { deliveryError: r.delivery_error.trim() } : {}),
  }));
}

export type NavBadgeCountsApi = {
  documents: number;
  tasksUrgent: number;
  calendarReminderDrafts: number;
  emailFailures: number;
};

function userHasGlobalProjectAccess(user: AuthUser): boolean {
  return (
    user.role === "super_admin" ||
    user.permissions.includes("project_access.global") ||
    user.permissions.includes("projects.view_all")
  );
}

function buildActiveProjectAccessSql(
  user: AuthUser,
  config: AppConfig,
  tableAlias = "p"
): { whereSql: string; params: unknown[] } {
  const params: unknown[] = [config.crmVaultProjectId];
  const where: string[] = [`${tableAlias}.deleted_at IS NULL`, `${tableAlias}.id <> $1::bigint`];
  if (!userHasGlobalProjectAccess(user)) {
    params.push(user.id);
    where.push(
      `EXISTS (SELECT 1 FROM public.project_assignments pa WHERE pa.project_id = ${tableAlias}.id AND pa.user_id = $${params.length}::bigint)`
    );
  }
  return { whereSql: where.join(" AND "), params };
}

/** Scope for nav badges — matches project list visibility (all active transactions, not assignment-only). */
function buildNavBadgeProjectScope(config: AppConfig): { whereSql: string; params: unknown[] } {
  const params: unknown[] = [config.crmVaultProjectId];
  const where: string[] = ["p.deleted_at IS NULL", `p.id <> $1::bigint`];
  return { whereSql: where.join(" AND "), params };
}

/** Sidebar nav badges — aggregated from DB (not client project cache). */
export async function getNavBadgeCounts(
  pool: Pool,
  config: AppConfig,
  user: AuthUser
): Promise<NavBadgeCountsApi> {
  const { whereSql, params } = buildNavBadgeProjectScope(config);

  const [documentsRow, tasksRow, emailRow, reminderEvents] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM public.project_documents pd
       JOIN public.projects p ON p.id = pd.project_id
       WHERE ${whereSql}
         AND pd.deleted_at IS NULL
         AND pd.required = true
         AND pd.status <> 'completed'::public.document_status
         AND COALESCE(btrim(pd.custom_status_text), '') <> 'N/A'`,
      params
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM public.projects p
       WHERE ${whereSql}
         AND p.next_step_date IS NOT NULL
         AND p.next_step_date <= CURRENT_DATE`,
      params
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM (
         SELECT e.delivery_status
         FROM public.emails e
         JOIN public.projects p ON p.id = e.project_id
         WHERE ${whereSql}
         ORDER BY COALESCE(e.sent_at, e.created_at) DESC
         LIMIT 50
       ) recent
       WHERE recent.delivery_status = 'failed'::public.email_delivery_status`,
      params
    ),
    listCalendarEvents(pool, { user, kinds: ["reminder"] }),
  ]);

  return {
    documents: Number(documentsRow.rows[0]?.count ?? 0),
    tasksUrgent: Number(tasksRow.rows[0]?.count ?? 0),
    calendarReminderDrafts: reminderEvents.length,
    emailFailures: Number(emailRow.rows[0]?.count ?? 0),
  };
}

async function getProjectEmails(pool: Pool, projectId: string): Promise<ProjectEmailApi[]> {
  const { rows } = await pool.query<{
    id: string;
    subject: string;
    from_address: string;
    to_address: string;
    cc: string | null;
    bcc: string | null;
    body: string;
    direction: string;
    sent_at: Date | null;
    created_at: Date;
    delivery_status: string | null;
    delivery_error: string | null;
  }>(
    `SELECT id::text, subject, from_address, to_address, cc, bcc, body, direction::text, sent_at, created_at,
            delivery_status::text AS delivery_status, delivery_error
     FROM public.emails
     WHERE project_id = $1::bigint
     ORDER BY COALESCE(sent_at, created_at) DESC`,
    [projectId]
  );
  const emailIds = rows.map((r) => r.id);
  const attachmentMap = new Map<string, ProjectEmailAttachmentApi[]>();
  if (emailIds.length > 0) {
    const { rows: attRows } = await pool.query<{
      email_id: string;
      id: string;
      stored_file_id: string;
      display_name: string;
      size_bytes: string;
    }>(
      `SELECT ea.email_id::text, ea.id::text, ea.stored_file_id::text, ea.display_name, sf.size_bytes::text
       FROM public.email_attachments ea
       JOIN public.stored_files sf ON sf.id = ea.stored_file_id AND sf.deleted_at IS NULL
       WHERE ea.email_id = ANY($1::bigint[])
       ORDER BY ea.sort_order ASC, ea.id ASC`,
      [emailIds]
    );
    for (const a of attRows) {
      const list = attachmentMap.get(a.email_id) ?? [];
      list.push({
        id: a.id,
        storedFileId: a.stored_file_id,
        name: a.display_name,
        sizeBytes: Number(a.size_bytes) || 0,
      });
      attachmentMap.set(a.email_id, list);
    }
  }
  return rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    from: r.from_address,
    to: r.to_address,
    ...(r.cc?.trim() ? { cc: r.cc.trim() } : {}),
    ...(r.bcc?.trim() ? { bcc: r.bcc.trim() } : {}),
    date: (r.sent_at ?? r.created_at).toISOString().split("T")[0],
    body: r.body,
    direction: r.direction === "inbound" ? "inbound" : "outbound",
    deliveryStatus: mapDeliveryStatus(r.delivery_status),
    ...(r.delivery_error?.trim() ? { deliveryError: r.delivery_error.trim() } : {}),
    ...(attachmentMap.get(r.id)?.length ? { attachments: attachmentMap.get(r.id) } : {}),
  }));
}

async function getProjectNotes(pool: Pool, projectId: string): Promise<ProjectNoteApi[]> {
  const { rows } = await pool.query<{
    id: string;
    body: string;
    created_at: Date;
    updated_at: Date;
    author_name: string | null;
  }>(
    `SELECT
       pn.id::text,
       pn.body,
       pn.created_at,
       pn.updated_at,
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
    updatedAt: r.updated_at.toISOString().split("T")[0],
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

function normalizeEsignDocumentId(raw: string | undefined | null): string | null {
  const t = normalizeText(raw ?? "");
  return /^\d+$/.test(t) ? t : null;
}

async function storedFileRowExists(pool: Pool, storedFileId: string): Promise<boolean> {
  const { rows } = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok FROM public.stored_files WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
    [storedFileId]
  );
  return rows.length > 0;
}

async function esignDocumentRowExists(pool: Pool, esignDocumentId: string): Promise<boolean> {
  const { rows } = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok FROM public.esign_documents WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
    [esignDocumentId]
  );
  return rows.length > 0;
}

/** Inserts `project_documents` plus optional `project_document_files` from create/update payload. */
async function insertProjectDocumentFromInput(
  pool: Pool,
  projectId: string,
  d: NonNullable<ProjectCreateInput["documents"]>[number],
  createdByUserId: string | null
): Promise<void> {
  const name = normalizeText(d.name);
  if (!name) return;
  const statusDb = DOC_STATUS_UI_TO_DB[d.status ?? "Pending"] ?? "pending";
  let esignId = normalizeEsignDocumentId(d.esignDocumentId ?? undefined);
  if (esignId && !(await esignDocumentRowExists(pool, esignId))) {
    esignId = null;
  }
  const ins = await pool.query<{ id: string }>(
    `INSERT INTO public.project_documents (
       project_id, display_name, status, custom_status_text, required,
       source_rule_id, source_rule_action_id, esign_document_id,
       created_by_user_id, created_at, updated_at
     ) VALUES (
       $1::bigint, $2, $3::public.document_status, $4, $5, $6::bigint, $7, $8::bigint, $9::bigint, now(), now()
     )
     RETURNING id::text`,
    [
      projectId,
      name,
      statusDb,
      normalizeText(d.customStatus) || null,
      Boolean(d.required),
      /^\d+$/.test(normalizeText(d.sourceRuleId)) ? normalizeText(d.sourceRuleId) : null,
      normalizeText(d.sourceRuleActionId) || null,
      esignId,
      createdByUserId && /^\d+$/.test(createdByUserId) ? createdByUserId : null,
    ]
  );
  const pdId = ins.rows[0]?.id;
  if (!pdId) return;
  const attached = Array.isArray(d.attachedFileIds) ? d.attachedFileIds : [];
  let attachSort = 0;
  for (let i = 0; i < attached.length; i++) {
    const fid = normalizeText(String(attached[i] ?? ""));
    if (!/^\d+$/.test(fid)) continue;
    if (!(await storedFileRowExists(pool, fid))) continue;
    await pool.query(
      `INSERT INTO public.project_document_files (
         project_document_id, stored_file_id, sort_order, is_primary, created_at, updated_at
       ) VALUES ($1::bigint, $2::bigint, $3, $4, now(), now())
       ON CONFLICT ON CONSTRAINT project_document_files_unique_file DO NOTHING`,
      [pdId, fid, attachSort, attachSort === 0]
    );
    attachSort += 1;
  }
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
    esign_document_id: string | null;
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
       pd.esign_document_id::text AS esign_document_id,
       COALESCE(
         ARRAY_AGG(pdf.stored_file_id::text ORDER BY pdf.sort_order NULLS LAST, pdf.id) FILTER (WHERE pdf.id IS NOT NULL),
         ARRAY[]::text[]
       ) AS attached_file_ids
     FROM public.project_documents pd
     LEFT JOIN public.project_document_files pdf ON pdf.project_document_id = pd.id
     WHERE pd.project_id = $1::bigint
       AND pd.deleted_at IS NULL
     GROUP BY pd.id, pd.display_name, pd.status, pd.custom_status_text, pd.required, pd.source_rule_id, pd.source_rule_action_id, pd.esign_document_id
     ORDER BY pd.created_at ASC`,
    [projectId]
  );
  const noteRows = await pool.query<{
    id: string;
    project_document_id: string;
    body: string;
    created_at: Date;
    updated_at: Date;
    author_name: string | null;
  }>(
    `SELECT
       pdn.id::text,
       pdn.project_document_id::text,
       pdn.body,
       pdn.created_at,
       pdn.updated_at,
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
    const createdAt = r.created_at.toISOString().split("T")[0];
    const updatedAt = r.updated_at.toISOString().split("T")[0];
    list.push({
      id: r.id,
      body: r.body,
      author: r.author_name ?? "Unknown",
      createdAt,
      ...(updatedAt !== createdAt ? { updatedAt } : {}),
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
    ...(r.esign_document_id ? { esignDocumentId: r.esign_document_id } : {}),
  }));
}

/** Soft-deleted project row for 404 messaging (list/detail hide these). */
export async function getProjectDeletedSnapshot(
  pool: Pool,
  projectId: string
): Promise<{ id: string; name: string } | null> {
  if (!/^\d+$/.test(projectId)) return null;
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id::text, name
     FROM public.projects
     WHERE id = $1::bigint AND deleted_at IS NOT NULL
     LIMIT 1`,
    [projectId]
  );
  return rows[0] ?? null;
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
       ${ESCROW_OFFICER_NAME_SQL} AS escrow_officer_name,
       p.escrow_company,
       p.list_price,
       p.created_at,
       p.metadata_json
     FROM public.projects p
     LEFT JOIN public.contacts c ON c.id = p.client_id
     LEFT JOIN public.transaction_party_contacts co ON co.id = p.escrow_officer_contact_id
     WHERE p.id = $1::bigint
       AND p.deleted_at IS NULL
     LIMIT 1`,
    [projectId]
  );
  const row = rows[0];
  if (!row) return null;
  const transactionType = TYPE_DB_TO_UI[row.transaction_type] ?? "Listing";
  await ensureInitialCompassTasksSeeded(pool, projectId, transactionType, row.metadata_json);
  const [documents, tasks, emails, notes, assignees, deadlines, timelineNotes] = await Promise.all([
    getProjectDocuments(pool, projectId),
    getProjectTasks(pool, projectId),
    getProjectEmails(pool, projectId),
    getProjectNotes(pool, projectId),
    getProjectAssignees(pool, projectId),
    getProjectDeadlines(pool, projectId),
    getProjectTimelineNotes(pool, projectId),
  ]);
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id,
    clientName: row.client_name ?? "Unassigned",
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
    timelineNotes,
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
    `SELECT 1::text AS ok FROM public.contacts WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
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
    await insertProjectDocumentFromInput(pool, projectId, d, createdByUserId && /^\d+$/.test(createdByUserId) ? createdByUserId : null);
  }
  await syncProjectDeadlinesFromFormMetadata(pool, projectId, input.metadata ?? null);
  if (typeDb === "buyer_file") {
    await seedCompassProjectTasks(pool, projectId, "Buyer File", "buyer_all");
  } else if (typeDb === "listing") {
    await seedCompassProjectTasks(pool, projectId, "Listing", "listing_pre_contract");
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
    `SELECT 1::text AS ok FROM public.contacts WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
    [clientId]
  );
  if (clientCheck.rows.length === 0) {
    return { error: { status: 404, code: "CLIENT_NOT_FOUND", message: "Linked client was not found." } };
  }
  const priorRow = await pool.query<{ metadata_json: unknown; transaction_type: string }>(
    `SELECT metadata_json, transaction_type::text AS transaction_type
     FROM public.projects
     WHERE id = $1::bigint AND deleted_at IS NULL
     LIMIT 1`,
    [projectId]
  );
  const priorMeta = priorRow.rows[0]?.metadata_json;
  const priorTypeDb = priorRow.rows[0]?.transaction_type;
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
      await insertProjectDocumentFromInput(pool, projectId, d, null);
    }
  }
  if (input.metadata !== undefined) {
    await syncProjectDeadlinesFromFormMetadata(pool, projectId, input.metadata ?? null);
    if (priorTypeDb === "listing" && input.metadata) {
      const wasAccepted = isContractAcceptedInMetadata(priorMeta);
      const nowAccepted = isContractAcceptedInMetadata(input.metadata);
      if (!wasAccepted && nowAccepted) {
        await seedCompassProjectTasks(pool, projectId, "Listing", "listing_post_contract");
      }
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

async function projectDeleteBlockedReason(pool: Pool, projectId: string): Promise<string | null> {
  const { rows: esignRows } = await pool.query<{ n: string }>(
    `SELECT 1::text AS n
     FROM public.esign_documents
     WHERE project_id = $1::bigint
       AND deleted_at IS NULL
       AND status IN ('sent', 'completed')
     LIMIT 1`,
    [projectId]
  );
  if (esignRows.length > 0) {
    return "This transaction has an eSign template with a sent or completed envelope. Wait for signing to finish or void the envelope before deleting.";
  }
  const { rows: envelopeRows } = await pool.query<{ n: string }>(
    `SELECT 1::text AS n
     FROM public.docusign_envelopes
     WHERE project_id = $1::bigint
       AND status IN ('sent'::public.docusign_envelope_status, 'delivered'::public.docusign_envelope_status, 'completed'::public.docusign_envelope_status)
     LIMIT 1`,
    [projectId]
  );
  if (envelopeRows.length > 0) {
    return "This transaction has an in-progress DocuSign envelope. Complete or void it before deleting the transaction.";
  }
  return null;
}

export async function deleteProjectDocument(
  pool: Pool,
  projectId: string,
  documentId: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(documentId)) {
    return { error: { status: 404, code: "PROJECT_DOCUMENT_NOT_FOUND", message: "Project document not found." } };
  }
  const requiredCheck = await pool.query<{ required: boolean }>(
    `SELECT required
     FROM public.project_documents
     WHERE id = $1::bigint
       AND project_id = $2::bigint
       AND deleted_at IS NULL
     LIMIT 1`,
    [documentId, projectId]
  );
  if (requiredCheck.rows.length === 0) {
    return { error: { status: 404, code: "PROJECT_DOCUMENT_NOT_FOUND", message: "Project document not found." } };
  }
  if (requiredCheck.rows[0]!.required) {
    return {
      error: {
        status: 409,
        code: "PROJECT_DOCUMENT_REQUIRED",
        message: "Required checklist documents cannot be deleted.",
      },
    };
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
  const blockReason = await projectDeleteBlockedReason(pool, projectId);
  if (blockReason) {
    return {
      error: {
        status: 409,
        code: "PROJECT_DELETE_BLOCKED",
        message: blockReason,
      },
    };
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

export async function restoreProject(
  pool: Pool,
  projectId: string
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const { rows: archived } = await pool.query<{ client_id: string }>(
    `SELECT client_id::text
     FROM public.projects
     WHERE id = $1::bigint
       AND deleted_at IS NOT NULL
     LIMIT 1`,
    [projectId]
  );
  if (!archived[0]) {
    return { error: { status: 404, code: "PROJECT_NOT_ARCHIVED", message: "Archived transaction not found." } };
  }
  const clientCheck = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok FROM public.contacts WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
    [archived[0].client_id]
  );
  if (clientCheck.rows.length === 0) {
    return {
      error: {
        status: 409,
        code: "PROJECT_CLIENT_ARCHIVED",
        message: "Restore the primary contact before restoring this transaction.",
      },
    };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.projects
     SET deleted_at = NULL, updated_at = now()
     WHERE id = $1::bigint
       AND deleted_at IS NOT NULL`,
    [projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_NOT_ARCHIVED", message: "Archived transaction not found." } };
  }
  return { ok: true };
}

/** Hard-delete a soft-archived transaction row (frees the contact for permanent delete). */
export async function permanentlyDeleteArchivedProject(
  pool: Pool,
  projectId: string
): Promise<{ ok: true } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const { rowCount } = await pool.query(
    `DELETE FROM public.projects
     WHERE id = $1::bigint
       AND deleted_at IS NOT NULL`,
    [projectId]
  );
  if (!rowCount) {
    return {
      error: {
        status: 404,
        code: "PROJECT_NOT_ARCHIVED",
        message: "Only archived transactions can be permanently removed.",
      },
    };
  }
  return { ok: true };
}

async function validateTaskEmailFields(
  pool: Pool,
  input: { taskType?: string; emailTemplateId?: string; recipientEmail?: string }
): Promise<ServiceError | null> {
  const taskType = normalizeText(input.taskType) || "general";
  if (taskType !== "general" && taskType !== "email") {
    return { status: 400, code: "PROJECT_TASK_TYPE_INVALID", message: "Task type is invalid." };
  }
  const templateId = normalizeText(input.emailTemplateId);
  if (templateId) {
    if (!/^\d+$/.test(templateId)) {
      return { status: 400, code: "PROJECT_TASK_TEMPLATE_INVALID", message: "Email template is invalid." };
    }
    const tpl = await pool.query<{ ok: string }>(
      `SELECT 1::text AS ok FROM public.email_templates WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
      [templateId]
    );
    if (tpl.rows.length === 0) {
      return { status: 400, code: "PROJECT_TASK_TEMPLATE_NOT_FOUND", message: "Email template was not found." };
    }
  }
  const recipient = normalizeText(input.recipientEmail);
  if (recipient && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return { status: 400, code: "PROJECT_TASK_RECIPIENT_INVALID", message: "Recipient email is invalid." };
  }
  if (taskType === "general" && (templateId || recipient)) {
    return {
      status: 400,
      code: "PROJECT_TASK_EMAIL_FIELDS_NOT_ALLOWED",
      message: "Email template and recipient apply only to email tasks.",
    };
  }
  return null;
}

export async function createProjectTask(
  pool: Pool,
  projectId: string,
  input: {
    title: string;
    stage: string;
    status?: string;
    dueDate?: string;
    taskType?: string;
    emailTemplateId?: string;
    recipientEmail?: string;
  }
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
  const emailValidation = await validateTaskEmailFields(pool, input);
  if (emailValidation) return { error: emailValidation };
  const taskTypeDb = mapTaskTypeToDb(normalizeText(input.taskType) || "general") ?? "general";
  const emailTemplateId =
    taskTypeDb === "email" && /^\d+$/.test(normalizeText(input.emailTemplateId))
      ? normalizeText(input.emailTemplateId)
      : null;
  const recipientEmail =
    taskTypeDb === "email" ? normalizeText(input.recipientEmail) || null : null;
  await pool.query(
    `INSERT INTO public.project_tasks (
       project_id, title, stage, status, due_date, completed_at,
       task_type, email_template_id, recipient_email,
       created_at, updated_at
     ) VALUES (
       $1::bigint, $2, $3::public.project_stage, $4::public.task_status, $5::date,
       CASE WHEN $4::public.task_status = 'complete'::public.task_status THEN now() ELSE NULL END,
       $6::public.project_task_type, $7::bigint, $8,
       now(), now()
     )`,
    [projectId, title, stageDb, statusDb, parseDateString(input.dueDate), taskTypeDb, emailTemplateId, recipientEmail]
  );
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

function mapTaskStatusToDb(status: string): "pending" | "in_progress" | "complete" | null {
  if (status === "In Progress") return "in_progress";
  if (status === "Complete") return "complete";
  if (status === "Pending") return "pending";
  return null;
}

export async function updateProjectTask(
  pool: Pool,
  projectId: string,
  taskId: string,
  input: {
    title?: string;
    stage?: string;
    status?: string;
    dueDate?: string;
    taskType?: string;
    emailTemplateId?: string;
    recipientEmail?: string;
  }
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(taskId)) {
    return { error: { status: 404, code: "PROJECT_TASK_NOT_FOUND", message: "Project task not found." } };
  }
  const hasTitle = input.title !== undefined;
  const hasStage = input.stage !== undefined;
  const hasStatus = input.status !== undefined;
  const hasDueDate = input.dueDate !== undefined;
  const hasTaskType = input.taskType !== undefined;
  const hasEmailTemplateId = input.emailTemplateId !== undefined;
  const hasRecipientEmail = input.recipientEmail !== undefined;
  if (!hasTitle && !hasStage && !hasStatus && !hasDueDate && !hasTaskType && !hasEmailTemplateId && !hasRecipientEmail) {
    return {
      error: { status: 400, code: "PROJECT_TASK_NOTHING_TO_UPDATE", message: "No task fields to update." },
    };
  }

  const sets: string[] = ["updated_at = now()"];
  const params: unknown[] = [];
  let idx = 1;

  if (hasTitle) {
    const title = normalizeText(input.title);
    if (!title) {
      return { error: { status: 400, code: "PROJECT_TASK_TITLE_REQUIRED", message: "Task title is required." } };
    }
    sets.push(`title = $${idx++}`);
    params.push(title);
  }

  if (hasStage) {
    const stageDb = mapStageToDb(input.stage ?? "");
    if (!stageDb) {
      return { error: { status: 400, code: "PROJECT_STAGE_INVALID", message: "Project stage is invalid." } };
    }
    sets.push(`stage = $${idx++}::public.project_stage`);
    params.push(stageDb);
  }

  if (hasStatus) {
    const statusDb = mapTaskStatusToDb(input.status ?? "");
    if (!statusDb) {
      return { error: { status: 400, code: "PROJECT_TASK_STATUS_INVALID", message: "Task status is invalid." } };
    }
    const statusParamIdx = idx;
    sets.push(`status = $${idx++}::public.task_status`);
    params.push(statusDb);
    sets.push(
      `completed_at = CASE WHEN $${statusParamIdx}::public.task_status = 'complete'::public.task_status THEN now() ELSE NULL END`
    );
  }

  if (hasDueDate) {
    sets.push(`due_date = $${idx++}::date`);
    params.push(parseDateString(input.dueDate));
  }

  if (hasTaskType || hasEmailTemplateId || hasRecipientEmail) {
    const current = await pool.query<{
      task_type: string;
      email_template_id: string | null;
      recipient_email: string | null;
    }>(
      `SELECT task_type::text, email_template_id::text, recipient_email
       FROM public.project_tasks
       WHERE id = $1::bigint AND project_id = $2::bigint
       LIMIT 1`,
      [taskId, projectId]
    );
    if (current.rows.length === 0) {
      return { error: { status: 404, code: "PROJECT_TASK_NOT_FOUND", message: "Project task not found." } };
    }
    const row = current.rows[0];
    const nextType = hasTaskType
      ? mapTaskTypeToDb(input.taskType ?? "")
      : mapTaskTypeToDb(TASK_TYPE_DB_TO_UI[row.task_type] ?? "general");
    if (!nextType) {
      return { error: { status: 400, code: "PROJECT_TASK_TYPE_INVALID", message: "Task type is invalid." } };
    }
    const nextTemplateId = hasEmailTemplateId
      ? normalizeText(input.emailTemplateId)
      : row.email_template_id ?? "";
    const nextRecipient = hasRecipientEmail
      ? normalizeText(input.recipientEmail)
      : row.recipient_email ?? "";
    const emailValidation = await validateTaskEmailFields(pool, {
      taskType: nextType,
      emailTemplateId: nextTemplateId || undefined,
      recipientEmail: nextRecipient || undefined,
    });
    if (emailValidation) return { error: emailValidation };
    sets.push(`task_type = $${idx++}::public.project_task_type`);
    params.push(nextType);
    if (nextType === "email") {
      sets.push(`email_template_id = $${idx++}::bigint`);
      params.push(/^\d+$/.test(nextTemplateId) ? nextTemplateId : null);
      sets.push(`recipient_email = $${idx++}`);
      params.push(nextRecipient || null);
    } else {
      sets.push(`email_template_id = NULL`);
      sets.push(`recipient_email = NULL`);
    }
  }

  params.push(taskId, projectId);
  const { rowCount } = await pool.query(
    `UPDATE public.project_tasks
     SET ${sets.join(", ")}
     WHERE id = $${idx++}::bigint
       AND project_id = $${idx}::bigint`,
    params
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_TASK_NOT_FOUND", message: "Project task not found." } };
  }
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
  return updateProjectTask(pool, projectId, taskId, { status });
}

export async function deleteProjectTask(
  pool: Pool,
  projectId: string,
  taskId: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(taskId)) {
    return { error: { status: 404, code: "PROJECT_TASK_NOT_FOUND", message: "Project task not found." } };
  }
  const { rowCount } = await pool.query(
    `DELETE FROM public.project_tasks WHERE id = $1::bigint AND project_id = $2::bigint`,
    [taskId, projectId]
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

export async function createReminderDraft(
  pool: Pool,
  projectId: string,
  input: { projectDeadlineId?: string; reminderType?: string; subject: string; body: string; to: string }
): Promise<{ id: string } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const subject = normalizeText(input.subject);
  const body = normalizeText(input.body);
  const to = normalizeText(input.to);
  const reminderType = normalizeText(input.reminderType) || "Reminder Draft";
  const projectDeadlineId = normalizeText(input.projectDeadlineId);
  if (!subject || !body || !to) {
    return { error: { status: 400, code: "REMINDER_DRAFT_INVALID", message: "To, subject, and body are required." } };
  }
  const projectExists = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok FROM public.projects WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
    [projectId]
  );
  if (!projectExists.rows[0]) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  let deadlineRef: string | null = null;
  if (projectDeadlineId && /^\d+$/.test(projectDeadlineId)) {
    const dl = await pool.query<{ id: string }>(
      `SELECT id::text
       FROM public.project_deadlines
       WHERE id = $1::bigint
         AND project_id = $2::bigint
       LIMIT 1`,
      [projectDeadlineId, projectId]
    );
    if (!dl.rows[0]) {
      return {
        error: { status: 404, code: "PROJECT_DEADLINE_NOT_FOUND", message: "Project deadline not found for this transaction." },
      };
    }
    deadlineRef = projectDeadlineId;
  }
  const ins = await pool.query<{ id: string }>(
    `INSERT INTO public.reminder_drafts (
       project_id, project_deadline_id, reminder_type, subject, body, to_address, status, sent_by_user_id, sent_at, created_at, updated_at
     ) VALUES (
       $1::bigint, $2::bigint, $3, $4, $5, $6, 'draft'::public.reminder_status, NULL, NULL, now(), now()
     )
     RETURNING id::text`,
    [projectId, deadlineRef, reminderType, subject, body, to]
  );
  const id = ins.rows[0]?.id;
  if (!id) {
    return { error: { status: 500, code: "REMINDER_DRAFT_CREATE_FAILED", message: "Could not create reminder draft." } };
  }
  return { id };
}

export async function createProjectEmail(
  pool: Pool,
  config: AppConfig,
  projectId: string,
  input: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    body: string;
    from?: string;
    templateId?: string | null;
    attachmentStoredFileIds?: string[];
  },
  sentByUserId: string | null
): Promise<
  | { project: ProjectDetailApi; emailSendFailed?: boolean; emailSendError?: string }
  | { error: ServiceError }
> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const toList = parseEmailAddressList(input.to);
  const ccList = parseEmailAddressList(input.cc ?? []);
  const bccList = parseEmailAddressList(input.bcc ?? []);
  const subject = normalizeText(input.subject);
  const body = normalizeText(input.body);
  if (toList.length === 0 || !subject || !body) {
    return { error: { status: 400, code: "PROJECT_EMAIL_INVALID", message: "To, subject, and body are required." } };
  }
  const attachmentIds = (input.attachmentStoredFileIds ?? []).filter((id) => /^\d+$/.test(id));
  if (attachmentIds.length > 10) {
    return { error: { status: 400, code: "PROJECT_EMAIL_TOO_MANY_ATTACHMENTS", message: "Maximum 10 attachments per email." } };
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
  const templateId =
    input.templateId && /^\d+$/.test(input.templateId) ? input.templateId : null;
  const toStored = formatEmailAddressList(toList);
  const ccStored = ccList.length ? formatEmailAddressList(ccList) : null;
  const bccStored = bccList.length ? formatEmailAddressList(bccList) : null;

  let resolvedAttachments: Array<{ storedFileId: string; filename: string; path: string; sizeBytes: number }> = [];
  if (attachmentIds.length > 0) {
    const { rows: fileRows } = await pool.query<{
      id: string;
      name: string;
      storage_key: string;
      size_bytes: string;
      source: string;
    }>(
      `SELECT id::text, name, storage_key, size_bytes::text, source::text
       FROM public.stored_files
       WHERE project_id = $1::bigint
         AND id = ANY($2::bigint[])
         AND deleted_at IS NULL
         AND storage_scope = 'transaction'::public.file_storage_scope`,
      [projectId, attachmentIds]
    );
    if (fileRows.length !== attachmentIds.length) {
      return {
        error: {
          status: 400,
          code: "PROJECT_EMAIL_ATTACHMENT_INVALID",
          message: "One or more attachments are invalid for this transaction.",
        },
      };
    }
    const uploadDirAbs = path.resolve(config.uploadDir);
    let totalBytes = 0;
    resolvedAttachments = [];
    for (const f of fileRows) {
      if (f.source !== "email_outbound") {
        return {
          error: {
            status: 400,
            code: "PROJECT_EMAIL_ATTACHMENT_INVALID",
            message: "Attachments must be uploaded from the email compose window.",
          },
        };
      }
      const size = Number(f.size_bytes) || 0;
      totalBytes += size;
      resolvedAttachments.push({
        storedFileId: f.id,
        filename: f.name,
        path: absolutePathForStorageKey(uploadDirAbs, f.storage_key),
        sizeBytes: size,
      });
    }
    if (totalBytes > 25 * 1024 * 1024) {
      return {
        error: {
          status: 400,
          code: "PROJECT_EMAIL_ATTACHMENT_TOO_LARGE",
          message: "Total attachment size cannot exceed 25 MB.",
        },
      };
    }
  }

  const ins = await pool.query<{ id: string }>(
    `INSERT INTO public.emails (
       project_id, client_id, template_id, direction, subject, body, from_address, to_address,
       cc, bcc, gmail_message_id, sent_by_user_id, sent_at, delivery_status, delivery_error, smtp_message_id,
       created_at, updated_at
     ) VALUES (
       $1::bigint, NULL, $2::bigint, 'outbound'::public.email_direction, $3, $4, $5, $6,
       $7, $8, NULL, $9::bigint, NULL, 'pending'::public.email_delivery_status, NULL, NULL,
       now(), now()
     )
     RETURNING id::text`,
    [projectId, templateId, subject, body, fromAddress, toStored, ccStored, bccStored, sentBy]
  );
  const emailId = ins.rows[0]?.id;
  if (!emailId) {
    return { error: { status: 500, code: "PROJECT_EMAIL_INSERT_FAILED", message: "Could not create email row." } };
  }

  for (let i = 0; i < resolvedAttachments.length; i++) {
    const att = resolvedAttachments[i]!;
    await pool.query(
      `INSERT INTO public.email_attachments (email_id, stored_file_id, display_name, sort_order)
       VALUES ($1::bigint, $2::bigint, $3, $4)`,
      [emailId, att.storedFileId, att.filename.slice(0, 512), i]
    );
  }

  try {
    const htmlBody = body.includes("<") ? body : `<p>${body.replace(/\n/g, "<br/>")}</p>`;
    const plainText = body.includes("<") ? body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : body;
    const { messageId } = await sendMailWithStoredSettings(pool, config, {
      to: toList,
      ...(ccList.length ? { cc: ccList } : {}),
      ...(bccList.length ? { bcc: bccList } : {}),
      subject,
      text: plainText || body,
      html: htmlBody,
      ...(resolvedAttachments.length
        ? { attachments: resolvedAttachments.map((a) => ({ filename: a.filename, path: a.path })) }
        : {}),
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

export async function deleteProjectEmail(
  pool: Pool,
  projectId: string,
  emailId: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(emailId)) {
    return { error: { status: 404, code: "PROJECT_EMAIL_NOT_FOUND", message: "Email not found." } };
  }
  const { rowCount } = await pool.query(
    `DELETE FROM public.emails
     WHERE id = $1::bigint AND project_id = $2::bigint`,
    [emailId, projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_EMAIL_NOT_FOUND", message: "Email not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
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

export async function updateProjectNote(
  pool: Pool,
  projectId: string,
  noteId: string,
  body: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(noteId)) {
    return { error: { status: 404, code: "PROJECT_NOTE_NOT_FOUND", message: "Note not found." } };
  }
  const trimmed = normalizeText(body);
  if (!trimmed) {
    return { error: { status: 400, code: "PROJECT_NOTE_BODY_REQUIRED", message: "Note text is required." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.project_notes
     SET body = $1, updated_at = now()
     WHERE id = $2::bigint AND project_id = $3::bigint`,
    [trimmed, noteId, projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_NOTE_NOT_FOUND", message: "Note not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function deleteProjectNote(
  pool: Pool,
  projectId: string,
  noteId: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(noteId)) {
    return { error: { status: 404, code: "PROJECT_NOTE_NOT_FOUND", message: "Note not found." } };
  }
  const { rowCount } = await pool.query(
    `DELETE FROM public.project_notes WHERE id = $1::bigint AND project_id = $2::bigint`,
    [noteId, projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_NOTE_NOT_FOUND", message: "Note not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function updateProjectDeadlineDate(
  pool: Pool,
  projectId: string,
  deadlineId: string,
  date: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(deadlineId)) {
    return { error: { status: 404, code: "PROJECT_DEADLINE_NOT_FOUND", message: "Deadline not found." } };
  }
  const dueDate = parseDateString(date);
  if (!dueDate) {
    return { error: { status: 400, code: "PROJECT_DEADLINE_INVALID", message: "Deadline date is required." } };
  }
  const dlRow = await pool.query<{ title: string }>(
    `SELECT title FROM public.project_deadlines WHERE id = $1::bigint AND project_id = $2::bigint LIMIT 1`,
    [deadlineId, projectId]
  );
  const title = dlRow.rows[0]?.title;
  if (!title) {
    return { error: { status: 404, code: "PROJECT_DEADLINE_NOT_FOUND", message: "Deadline not found." } };
  }

  if (isFormManagedDeadlineTitle(title)) {
    const metadata = await loadProjectMetadata(pool, projectId);
    if (metadata === null && !(await pool.query(`SELECT 1 FROM public.projects WHERE id = $1::bigint AND deleted_at IS NULL`, [projectId])).rows[0]) {
      return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
    }
    const nextMeta = applyFormDeadlineDateToMetadata(metadata, title, date.trim());
    await saveProjectMetadataAndSyncDeadlines(pool, projectId, nextMeta);
  } else {
    const { rowCount } = await pool.query(
      `UPDATE public.project_deadlines SET due_date = $1::date, updated_at = now() WHERE id = $2::bigint AND project_id = $3::bigint`,
      [dueDate, deadlineId, projectId]
    );
    if (!rowCount) {
      return { error: { status: 404, code: "PROJECT_DEADLINE_NOT_FOUND", message: "Deadline not found." } };
    }
  }

  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function updateProjectTimelineFieldDate(
  pool: Pool,
  projectId: string,
  fieldKey: string,
  date: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const title = FORM_TIMELINE_FIELD_KEY_TO_TITLE[fieldKey.trim()];
  if (!title) {
    return {
      error: { status: 400, code: "PROJECT_TIMELINE_FIELD_INVALID", message: "Unknown timeline field." },
    };
  }
  const trimmedDate = date.trim();
  // A milestone can be marked Completed / N/A (or cleared) instead of holding a date.
  const isStatusOrCleared = trimmedDate === "" || TIMELINE_STATUS_SENTINELS.has(trimmedDate);
  if (!isStatusOrCleared) {
    const dueDate = parseDateString(date);
    if (!dueDate) {
      return { error: { status: 400, code: "PROJECT_DEADLINE_INVALID", message: "Deadline date is required." } };
    }
  }
  const metadata = await loadProjectMetadata(pool, projectId);
  if (metadata === null && !(await pool.query(`SELECT 1 FROM public.projects WHERE id = $1::bigint AND deleted_at IS NULL`, [projectId])).rows[0]) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const nextMeta = applyFormDeadlineDateToMetadata(metadata, title, date.trim());
  await saveProjectMetadataAndSyncDeadlines(pool, projectId, nextMeta);
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

type CustomTimelineInputItem = {
  id: string;
  title: string;
  kind: "date" | "text";
  value: string;
};

function parseCustomTimelineInput(raw: unknown): CustomTimelineInputItem[] | null {
  if (!Array.isArray(raw)) return null;
  const out: CustomTimelineInputItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const kind = row.kind === "text" ? "text" : row.kind === "date" ? "date" : null;
    const value = typeof row.value === "string" ? row.value.trim() : "";
    if (!id || !title || !kind) continue;
    out.push({ id, title, kind, value });
  }
  return out;
}

export async function updateProjectCustomTimeline(
  pool: Pool,
  projectId: string,
  customTimeline: unknown
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const parsed = parseCustomTimelineInput(customTimeline);
  if (!parsed) {
    return {
      error: { status: 400, code: "PROJECT_CUSTOM_TIMELINE_INVALID", message: "Custom timeline must be an array." },
    };
  }
  const metadata = await loadProjectMetadata(pool, projectId);
  if (
    metadata === null &&
    !(await pool.query(`SELECT 1 FROM public.projects WHERE id = $1::bigint AND deleted_at IS NULL`, [projectId])).rows[0]
  ) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const md =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  md.customTimeline = parsed;
  await saveProjectMetadataAndSyncDeadlines(pool, projectId, md);
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function deleteProjectDeadline(
  pool: Pool,
  projectId: string,
  deadlineId: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(deadlineId)) {
    return { error: { status: 404, code: "PROJECT_DEADLINE_NOT_FOUND", message: "Deadline not found." } };
  }
  const dlRow = await pool.query<{ title: string }>(
    `SELECT title FROM public.project_deadlines WHERE id = $1::bigint AND project_id = $2::bigint LIMIT 1`,
    [deadlineId, projectId]
  );
  const title = dlRow.rows[0]?.title;
  if (!title) {
    return { error: { status: 404, code: "PROJECT_DEADLINE_NOT_FOUND", message: "Deadline not found." } };
  }

  if (isFormManagedDeadlineTitle(title)) {
    const metadata = await loadProjectMetadata(pool, projectId);
    const nextMeta = applyFormDeadlineDateToMetadata(metadata, title, "");
    await saveProjectMetadataAndSyncDeadlines(pool, projectId, nextMeta);
  } else {
    const metadata = await loadProjectMetadata(pool, projectId);
    const md =
      metadata && typeof metadata === "object" && !Array.isArray(metadata)
        ? { ...(metadata as Record<string, unknown>) }
        : {};
    const customRaw = md.customTimeline;
    if (Array.isArray(customRaw)) {
      md.customTimeline = customRaw.filter((entry) => {
        if (!entry || typeof entry !== "object") return true;
        const row = entry as Record<string, unknown>;
        return strMeta(row.title) !== title;
      });
      await saveProjectMetadataAndSyncDeadlines(pool, projectId, md);
    } else {
      const { rowCount } = await pool.query(
        `DELETE FROM public.project_deadlines WHERE id = $1::bigint AND project_id = $2::bigint`,
        [deadlineId, projectId]
      );
      if (!rowCount) {
        return { error: { status: 404, code: "PROJECT_DEADLINE_NOT_FOUND", message: "Deadline not found." } };
      }
    }
  }

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

export async function updateProjectDocumentNote(
  pool: Pool,
  projectId: string,
  documentId: string,
  noteId: string,
  body: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(documentId) || !/^\d+$/.test(noteId)) {
    return { error: { status: 404, code: "PROJECT_DOCUMENT_NOTE_NOT_FOUND", message: "Document note not found." } };
  }
  const trimmed = normalizeText(body);
  if (!trimmed) {
    return { error: { status: 400, code: "PROJECT_DOCUMENT_NOTE_BODY_REQUIRED", message: "Note text is required." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.project_document_notes pdn
     SET body = $1, updated_at = now()
     FROM public.project_documents pd
     WHERE pdn.id = $2::bigint
       AND pdn.project_document_id = pd.id
       AND pd.id = $3::bigint
       AND pd.project_id = $4::bigint
       AND pd.deleted_at IS NULL`,
    [trimmed, noteId, documentId, projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_DOCUMENT_NOTE_NOT_FOUND", message: "Document note not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function deleteProjectDocumentNote(
  pool: Pool,
  projectId: string,
  documentId: string,
  noteId: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(documentId) || !/^\d+$/.test(noteId)) {
    return { error: { status: 404, code: "PROJECT_DOCUMENT_NOTE_NOT_FOUND", message: "Document note not found." } };
  }
  const { rowCount } = await pool.query(
    `DELETE FROM public.project_document_notes pdn
     USING public.project_documents pd
     WHERE pdn.id = $1::bigint
       AND pdn.project_document_id = pd.id
       AND pd.id = $2::bigint
       AND pd.project_id = $3::bigint
       AND pd.deleted_at IS NULL`,
    [noteId, documentId, projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_DOCUMENT_NOTE_NOT_FOUND", message: "Document note not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function createProjectTaskNote(
  pool: Pool,
  projectId: string,
  taskId: string,
  body: string,
  authorUserId: string | null
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(taskId)) {
    return { error: { status: 404, code: "PROJECT_TASK_NOT_FOUND", message: "Task not found." } };
  }
  const trimmed = normalizeText(body);
  if (!trimmed) {
    return { error: { status: 400, code: "PROJECT_TASK_NOTE_BODY_REQUIRED", message: "Note text is required." } };
  }
  const existing = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok
     FROM public.project_tasks
     WHERE id = $1::bigint
       AND project_id = $2::bigint
     LIMIT 1`,
    [taskId, projectId]
  );
  if (existing.rows.length === 0) {
    return { error: { status: 404, code: "PROJECT_TASK_NOT_FOUND", message: "Task not found." } };
  }
  await pool.query(
    `INSERT INTO public.project_task_notes (
       project_task_id, author_user_id, body, created_at, updated_at
     ) VALUES (
       $1::bigint, $2::bigint, $3, now(), now()
     )`,
    [taskId, authorUserId && /^\d+$/.test(authorUserId) ? authorUserId : null, trimmed]
  );
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function updateProjectTaskNote(
  pool: Pool,
  projectId: string,
  taskId: string,
  noteId: string,
  body: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(taskId) || !/^\d+$/.test(noteId)) {
    return { error: { status: 404, code: "PROJECT_TASK_NOTE_NOT_FOUND", message: "Task note not found." } };
  }
  const trimmed = normalizeText(body);
  if (!trimmed) {
    return { error: { status: 400, code: "PROJECT_TASK_NOTE_BODY_REQUIRED", message: "Note text is required." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.project_task_notes ptn
     SET body = $1, updated_at = now()
     FROM public.project_tasks pt
     WHERE ptn.id = $2::bigint
       AND ptn.project_task_id = pt.id
       AND pt.id = $3::bigint
       AND pt.project_id = $4::bigint`,
    [trimmed, noteId, taskId, projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_TASK_NOTE_NOT_FOUND", message: "Task note not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function deleteProjectTaskNote(
  pool: Pool,
  projectId: string,
  taskId: string,
  noteId: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(taskId) || !/^\d+$/.test(noteId)) {
    return { error: { status: 404, code: "PROJECT_TASK_NOTE_NOT_FOUND", message: "Task note not found." } };
  }
  const { rowCount } = await pool.query(
    `DELETE FROM public.project_task_notes ptn
     USING public.project_tasks pt
     WHERE ptn.id = $1::bigint
       AND ptn.project_task_id = pt.id
       AND pt.id = $2::bigint
       AND pt.project_id = $3::bigint`,
    [noteId, taskId, projectId]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_TASK_NOTE_NOT_FOUND", message: "Task note not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function createProjectTimelineNote(
  pool: Pool,
  projectId: string,
  fieldKey: string,
  body: string,
  authorUserId: string | null
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId)) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  const key = fieldKey.trim();
  if (!isValidTimelineNoteFieldKey(key)) {
    return { error: { status: 400, code: "PROJECT_TIMELINE_FIELD_INVALID", message: "Unknown timeline field." } };
  }
  const trimmed = normalizeText(body);
  if (!trimmed) {
    return { error: { status: 400, code: "PROJECT_TIMELINE_NOTE_BODY_REQUIRED", message: "Note text is required." } };
  }
  const existing = await pool.query<{ ok: string }>(
    `SELECT 1::text AS ok FROM public.projects WHERE id = $1::bigint AND deleted_at IS NULL LIMIT 1`,
    [projectId]
  );
  if (existing.rows.length === 0) {
    return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  }
  await pool.query(
    `INSERT INTO public.project_timeline_notes (
       project_id, field_key, author_user_id, body, created_at, updated_at
     ) VALUES (
       $1::bigint, $2, $3::bigint, $4, now(), now()
     )`,
    [projectId, key, authorUserId && /^\d+$/.test(authorUserId) ? authorUserId : null, trimmed]
  );
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function updateProjectTimelineNote(
  pool: Pool,
  projectId: string,
  fieldKey: string,
  noteId: string,
  body: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(noteId)) {
    return { error: { status: 404, code: "PROJECT_TIMELINE_NOTE_NOT_FOUND", message: "Timeline note not found." } };
  }
  const trimmed = normalizeText(body);
  if (!trimmed) {
    return { error: { status: 400, code: "PROJECT_TIMELINE_NOTE_BODY_REQUIRED", message: "Note text is required." } };
  }
  const { rowCount } = await pool.query(
    `UPDATE public.project_timeline_notes ptn
     SET body = $1, updated_at = now()
     WHERE ptn.id = $2::bigint
       AND ptn.project_id = $3::bigint
       AND ptn.field_key = $4`,
    [trimmed, noteId, projectId, fieldKey.trim()]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_TIMELINE_NOTE_NOT_FOUND", message: "Timeline note not found." } };
  }
  const project = await getProjectById(pool, projectId);
  if (!project) return { error: { status: 404, code: "PROJECT_NOT_FOUND", message: "Project not found." } };
  return { project };
}

export async function deleteProjectTimelineNote(
  pool: Pool,
  projectId: string,
  fieldKey: string,
  noteId: string
): Promise<{ project: ProjectDetailApi } | { error: ServiceError }> {
  if (!/^\d+$/.test(projectId) || !/^\d+$/.test(noteId)) {
    return { error: { status: 404, code: "PROJECT_TIMELINE_NOTE_NOT_FOUND", message: "Timeline note not found." } };
  }
  const { rowCount } = await pool.query(
    `DELETE FROM public.project_timeline_notes ptn
     WHERE ptn.id = $1::bigint
       AND ptn.project_id = $2::bigint
       AND ptn.field_key = $3`,
    [noteId, projectId, fieldKey.trim()]
  );
  if (!rowCount) {
    return { error: { status: 404, code: "PROJECT_TIMELINE_NOTE_NOT_FOUND", message: "Timeline note not found." } };
  }
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
