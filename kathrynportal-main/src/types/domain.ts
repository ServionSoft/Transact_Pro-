// Shared domain types and constants for the portal UI.

export type ClientStatus = "Active" | "Inactive" | "Prospect";
export type ProjectStage = "Listing Prep" | "Listing Complete" | "In Escrow" | "Ready to Close" | "Closed";
export type ProjectType = "Listing" | "Buyer File" | "Seller Listing" | "Buyer Representation" | "Dual Agency";

export const projectTypeLabel = (t: ProjectType): "Listing" | "Buyer File" => {
  if (t === "Buyer File" || t === "Buyer Representation") return "Buyer File";
  return "Listing";
};
export const isBuyerFile = (t: ProjectType) => projectTypeLabel(t) === "Buyer File";

export const LISTING_ONLY_STAGES: ProjectStage[] = ["Listing Prep", "Listing Complete"];
export const ALL_STAGES: ProjectStage[] = ["Listing Prep", "Listing Complete", "In Escrow", "Ready to Close", "Closed"];

export type DocumentStatus =
  | "Pending"
  | "Needs Buyer Signature"
  | "Needs Seller Signature"
  | "Out for Signature"
  | "Signed — Needs Upload"
  | "Uploaded to Brokerage"
  | "Completed"
  | "Other"
  | "Needs Signature"
  | "Signed"
  | "Uploaded"
  | "Complete";

export const DOC_STATUS_PRESETS: DocumentStatus[] = [
  "Pending",
  "Needs Buyer Signature",
  "Needs Seller Signature",
  "Out for Signature",
  "Signed — Needs Upload",
  "Uploaded to Brokerage",
  "Completed",
  "Other",
];

export interface ReminderDraft {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  reminderType: string;
  deadlineDate: string;
  subject: string;
  body: string;
  createdAt: string;
}

export type TaskStatus = "Pending" | "In Progress" | "Complete";

export interface ClientAssistant {
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  email?: string;
}

export interface ClientDetails {
  licenseNumber?: string;
  brokerageLicense?: string;
  logo?: string;
  /** @deprecated legacy single assistant; still read for back-compat, superseded by `assistants`. */
  assistant?: ClientAssistant;
  /** Escrow officer roster; the first entry is the default used to auto-fill transactions. */
  assistants?: ClientAssistant[];
}

/** Resolves an officer's assistant roster, reading the new array and falling back to the legacy single assistant. */
export function getClientAssistants(details: ClientDetails | undefined): ClientAssistant[] {
  if (!details) return [];
  const list = Array.isArray(details.assistants)
    ? details.assistants
    : details.assistant
    ? [details.assistant]
    : [];
  return list.filter((a) => a && (a.firstName || a.lastName || a.preferredName || a.email));
}

/** Human-readable label for an assistant entry (prefers preferred name). */
export function clientAssistantLabel(a: ClientAssistant): string {
  return (
    [a.preferredName || a.firstName, a.lastName].filter(Boolean).join(" ").trim() ||
    (a.email ?? "").trim() ||
    "Assistant"
  );
}

export interface Client {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  status: ClientStatus;
  propertyAddress: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
  assistantContactId?: string;
  details?: ClientDetails;
  createdAt: string;
  projectCount: number;
}

export interface ProjectDocument {
  id: string;
  name: string;
  status: DocumentStatus;
  required: boolean;
  uploadedFile?: string;
  attachedFileIds: string[];
  notes: { id: string; date: string; text: string; author: string; updatedAt?: string }[];
  customStatus?: string;
  sourceRuleId?: string;
  sourceRuleActionId?: string;
  esignDocumentId?: string;
}

export type ProjectTaskType = "general" | "email";

export interface ProjectTask {
  id: string;
  title: string;
  stage: string;
  status: TaskStatus;
  dueDate: string;
  completedDate?: string;
  taskType?: ProjectTaskType;
  emailTemplateId?: string;
  recipientEmail?: string;
  taskSection?: string;
  sortOrder?: number;
  instructionUrl?: string;
  notes?: { id: string; date: string; text: string; author: string; updatedAt?: string }[];
}

export interface EmailThreadAttachment {
  id: string;
  storedFileId: string;
  name: string;
  sizeBytes: number;
}

export interface EmailThread {
  id: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  date: string;
  body: string;
  direction: "inbound" | "outbound";
  deliveryStatus?: "pending" | "sent" | "failed";
  deliveryError?: string | null;
  attachments?: EmailThreadAttachment[];
}

export interface FileAttachment {
  id: string;
  name: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  type: string;
  folderId?: string | null;
  localObjectUrl?: string;
  downloadUrl?: string;
  serverBacked?: boolean;
}

export interface ProjectFolder {
  id: string;
  name: string;
  parentId: string | null;
}

/** Stable id for the CRM-wide file pool (Documents page). Not a client transaction. */
export const CRM_DOCUMENT_VAULT_PROJECT_ID = "crm-doc-vault";

export interface Project {
  id: string;
  isCrmDocumentVault?: boolean;
  name: string;
  clientId: string;
  clientName: string;
  propertyAddress: string;
  type: ProjectType;
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
  documents: ProjectDocument[];
  tasks: ProjectTask[];
  emails: EmailThread[];
  notes?: { id: string; body: string; author: string; createdAt: string; updatedAt?: string }[];
  assignees?: { userId: string; name: string; email: string; designation?: string | null }[];
  deadlines: { id: string; title: string; date: string; type: string; formManaged?: boolean }[];
  timelineNotes?: Record<string, Array<{ id?: string; body?: string; createdAt?: string; updatedAt?: string; author?: string }>>;
  attachments: FileAttachment[];
  fileFolders: ProjectFolder[];
  metadata?: Record<string, unknown>;
}

export function isTransactionProject(p: Project): boolean {
  return !p.isCrmDocumentVault;
}

/** Empty shell for the CRM document library in client state until API hydrates files. */
export function createCrmDocumentVaultProject(): Project {
  return {
    id: CRM_DOCUMENT_VAULT_PROJECT_ID,
    isCrmDocumentVault: true,
    name: "CRM document library",
    clientId: "crm-vault",
    clientName: "",
    propertyAddress: "",
    type: "Listing",
    stage: "Closed",
    nextStep: "",
    nextStepDate: "",
    yearBuilt: "",
    propertyType: "",
    representationSide: "",
    escrowOfficer: "",
    escrowCompany: "",
    listPrice: "",
    createdAt: new Date().toISOString().split("T")[0],
    documents: [],
    tasks: [],
    emails: [],
    deadlines: [],
    attachments: [],
    fileFolders: [],
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
}

export interface CalendarEvent {
  id: string;
  sourceId?: string;
  title: string;
  date: string;
  projectId: string;
  projectName: string;
  type: "deadline" | "reminder" | "task" | "meeting" | "close";
  propertyAddress: string;
  clientName?: string;
  clientEmail?: string;
  source?: "project_tasks" | "project_deadlines" | "reminder_drafts" | "projects";
  isOverdue?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Coordinator" | "Viewer" | "Super Admin";
  status: "Active" | "Invited" | "Inactive";
  joinedAt: string;
  lastActive: string;
  permissionProfile?: string | null;
}

export interface DocumentRule {
  id: string;
  name: string;
  required: boolean;
  section?: string;
  note?: string;
  storedFileId?: string;
}

export type RuleTriggerField =
  | "transactionType"
  | "propertyType"
  | "exemptSeller"
  | "hoa"
  | "tenantOccupied"
  | "county"
  | "dualAgency"
  | "financing";

export interface RuleTrigger {
  field: RuleTriggerField;
  value: string;
}

export type RuleAction = "add-required" | "add-optional" | "mark-na";

export interface RuleDocumentAction {
  id: string;
  documentName: string;
  action: RuleAction;
  note?: string;
  storedFileId?: string;
}

export type RuleKind = "standard" | "conditional";

export interface ConditionalFormattingRule {
  id: string;
  name: string;
  kind: RuleKind;
  triggers: RuleTrigger[];
  documents: DocumentRule[];
  actions: RuleDocumentAction[];
  isActive: boolean;
  createdAt: string;
  transactionType?: ProjectType;
  propertyType?: string;
}
