// Mock data for the Real Estate Transaction Management Portal

export type ClientStatus = "Active" | "Inactive" | "Prospect";
// Final stages per client spec (4.19.26):
export type ProjectStage = "Listing Prep" | "Listing Complete" | "In Escrow" | "Ready to Close" | "Closed";
// Two transaction types per client spec. Legacy values kept for back-compat with older seed data.
export type ProjectType = "Listing" | "Buyer File" | "Seller Listing" | "Buyer Representation" | "Dual Agency";

// Display label helpers
export const projectTypeLabel = (t: ProjectType): "Listing" | "Buyer File" => {
  if (t === "Buyer File" || t === "Buyer Representation") return "Buyer File";
  return "Listing";
};
export const isBuyerFile = (t: ProjectType) => projectTypeLabel(t) === "Buyer File";

// Stages a Buyer File never enters (Listing files only)
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
  // legacy values still used in seed data — keep for back-compat
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

export const reminderDrafts: ReminderDraft[] = [
  {
    id: "rd1",
    projectId: "p1",
    projectName: "1247 Ocean View Dr",
    clientName: "Sarah Mitchell",
    reminderType: "Seller Disclosures Due",
    deadlineDate: "2026-02-28",
    subject: "Reminder — Seller Disclosures Due Friday",
    body: "Hi Sarah,\n\nJust a friendly reminder that the seller disclosures (TDS and SPQ) for 1247 Ocean View Dr are due Friday, 2026-02-28. Let me know if you need me to resend the forms.\n\nThanks,\nKathryn",
    createdAt: "2026-02-23",
  },
  {
    id: "rd2",
    projectId: "p2",
    projectName: "892 Maple St",
    clientName: "David Chen",
    reminderType: "Inspection Contingency Removal",
    deadlineDate: "2026-02-28",
    subject: "Action Needed — Inspection Contingency Removal",
    body: "Hi David,\n\nThe inspection contingency removal for 892 Maple St is due 2026-02-28. Please confirm whether your buyer is ready to remove the contingency or needs to negotiate repairs.\n\nBest,\nKathryn",
    createdAt: "2026-02-24",
  },
  {
    id: "rd3",
    projectId: "p4",
    projectName: "3400 Newport Coast",
    clientName: "James Thompson",
    reminderType: "Pre-Approval Letter Due",
    deadlineDate: "2026-02-26",
    subject: "Pre-Approval Letter — 3400 Newport Coast",
    body: "Hi James,\n\nWe still need the pre-approval letter from your buyer's lender for 3400 Newport Coast. The deadline is 2026-02-26.\n\nKathryn",
    createdAt: "2026-02-22",
  },
];
export type TaskStatus = "Pending" | "In Progress" | "Complete";

export interface Client {
  id: string;
  name: string;
  /** Informal / display name (legal name stays in name). */
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
  createdAt: string;
  projectCount: number;
}

export interface ProjectDocument {
  id: string;
  name: string;
  status: DocumentStatus;
  required: boolean;
  /** Legacy display field; kept in sync with first linked pool file name when possible */
  uploadedFile?: string;
  /** Pool file ids (`attachments`) linked to this checklist row (M:N with `project_document_files`) */
  attachedFileIds: string[];
  notes: { date: string; text: string; author: string }[];
}

export interface ProjectTask {
  id: string;
  title: string;
  stage: string;
  status: TaskStatus;
  dueDate: string;
  completedDate?: string;
}

export interface EmailThread {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  direction: "inbound" | "outbound";
  /** Outbound SMTP delivery; inbound rows typically omit or use "sent". */
  deliveryStatus?: "pending" | "sent" | "failed";
  deliveryError?: string | null;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  type: string;
  /** `null` = unfiled / inbox; otherwise matches `ProjectFolder.id` */
  folderId?: string | null;
  /** Browser-only download URL for files picked in-session */
  localObjectUrl?: string;
  /** Signed or public URL from the API for server-stored binaries */
  downloadUrl?: string;
  /** Pool row came from the API / DB; use HTTP for delete/move when API is enabled */
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
  /** When true, project is the CRM document library only — hide from Transactions and contact links */
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
  notes?: { id: string; body: string; author: string; createdAt: string }[];
  assignees?: { userId: string; name: string; email: string; designation?: string | null }[];
  deadlines: { id: string; title: string; date: string; type: string }[];
  attachments: FileAttachment[];
  fileFolders: ProjectFolder[];
  metadata?: Record<string, unknown>;
}

/** Transactions shown in the app (excludes the CRM document vault). */
export function isTransactionProject(p: Project): boolean {
  return !p.isCrmDocumentVault;
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
  title: string;
  date: string;
  projectId: string;
  projectName: string;
  type: "deadline" | "reminder" | "task";
  propertyAddress: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Coordinator" | "Viewer" | "Super Admin";
  status: "Active" | "Invited" | "Inactive";
  joinedAt: string;
  lastActive: string;
  /** Permission profile name when using API-backed team list. */
  permissionProfile?: string | null;
}

export interface DocumentRule {
  id: string;
  name: string;
  required: boolean;
  /** Optional category/section for grouping in the checklist UI. */
  section?: string;
  /** Optional note carried over from the client's source spreadsheet. */
  note?: string;
  /** When row was chosen from CRM vault `stored_files` (Settings rule builder). */
  storedFileId?: string;
}

/** Field-value triggers supported by the rules engine. Mirror the client's checklist automation sheet. */
export type RuleTriggerField =
  | "transactionType"   // Listing | Buyer File
  | "propertyType"      // SFR | Condo | Vacant Land | ...
  | "exemptSeller"      // Yes | No
  | "hoa"               // Yes | No
  | "tenantOccupied"    // Yes | No
  | "county"            // Marin | ...
  | "dualAgency"        // Yes | No
  | "financing";        // All Cash | Conventional | FHA | VA | ...

export interface RuleTrigger {
  field: RuleTriggerField;
  /** Match value. "Any" / "*" means the rule always applies for that field. */
  value: string;
}

/** What happens to a document when the rule's triggers all match. */
export type RuleAction = "add-required" | "add-optional" | "mark-na";

export interface RuleDocumentAction {
  id: string;
  documentName: string;
  action: RuleAction;
  /** Optional condition note (e.g. "if Seller Entity is also a Trust"). */
  note?: string;
  /** When action targets a CRM vault `stored_files` row. */
  storedFileId?: string;
}

/** Two kinds of rules: a "standard" baseline checklist, and "conditional" overlays. */
export type RuleKind = "standard" | "conditional";

export interface ConditionalFormattingRule {
  id: string;
  name: string;
  kind: RuleKind;
  /** Triggers ALL must match. Empty means always-on (standard baseline). */
  triggers: RuleTrigger[];
  /** Used by "standard" baseline rules — the full document list to seed. */
  documents: DocumentRule[];
  /** Used by "conditional" rules — actions applied on top of the baseline. */
  actions: RuleDocumentAction[];
  isActive: boolean;
  createdAt: string;
  /** Legacy fields kept for back-compat with older UI references. */
  transactionType?: ProjectType;
  propertyType?: string;
}

// ---------- Standard Listing Checklist (from client's Checklist_Automation sheet) ----------
const standardListingDocs: DocumentRule[] = [
  // Listing Agreement Documents
  { id: "sd1",  section: "Listing Agreement Documents", name: "[AD] Disclosure Regarding Real Estate Agency Relationships", required: true },
  { id: "sd2",  section: "Listing Agreement Documents", name: "[RLA] Residential Listing Agreement", required: true },
  { id: "sd3",  section: "Listing Agreement Documents", name: "[MLSA] Multiple Listing Service Addendum", required: true },
  { id: "sd4",  section: "Listing Agreement Documents", name: "[BCA] Broker Compensation Advisory", required: true },
  { id: "sd5",  section: "Listing Agreement Documents", name: "[PRBS] Possible Representation of more than one Buyer or Seller", required: true },
  { id: "sd6",  section: "Listing Agreement Documents", name: "[FHDA] Fair Housing & Discrimination Advisory", required: true },
  { id: "sd7",  section: "Listing Agreement Documents", name: "[SA] Seller's Advisory", required: true },
  { id: "sd8",  section: "Listing Agreement Documents", name: "[CCPA] California Consumer Privacy Act Advisory", required: true },
  // Listing Disclosures
  { id: "sd9",  section: "Listing Disclosures", name: "[Compass ABAD] Compass Affiliated Business Arrangement Disclosure", required: true, note: "Duplicate w/checklist below. Only needs to be signed by Seller once" },
  { id: "sd10", section: "Listing Disclosures", name: "[Compass ARVR] Advisory Regarding Vendor / Service Provider Recommendations", required: true },
  { id: "sd11", section: "Listing Disclosures", name: "[DIA] Disclosure Information Advisory", required: true },
  { id: "sd12", section: "Listing Disclosures", name: "[MCA] Market Conditions Advisory", required: true, note: "Duplicate w/checklist below. Only needs to be signed by Seller once" },
  { id: "sd13", section: "Listing Disclosures", name: "[WFA] Wire Fraud Advisory", required: true },
  { id: "sd14", section: "Listing Disclosures", name: "[CMA] Comparative Market Analysis", required: true },
  { id: "sd15", section: "Listing Disclosures", name: "NHD Invoice", required: true },
  { id: "sd16", section: "Listing Disclosures", name: "Preliminary Title Report", required: true },
  { id: "sd17", section: "Listing Disclosures", name: "Realist Property Details", required: true, note: "Duplicate w/checklist below. Only needs to be signed by Seller once" },
  { id: "sd18", section: "Listing Disclosures", name: "Compass Seller Acknowledgement of Obligation to Secure Belongings", required: true },
  { id: "sd19", section: "Listing Disclosures", name: "MLS Printout", required: true },
  { id: "sd20", section: "Listing Disclosures", name: "Rejected Offer 1", required: false },
  // Seller Disclosures - Questionnaires
  { id: "sd21", section: "Seller Disclosures - Questionnaires", name: "[TDS] Transfer Disclosure Statement", required: true },
  { id: "sd22", section: "Seller Disclosures - Questionnaires", name: "[AVID] Agent Visual Inspection Disclosure - Listing Agent", required: true },
  { id: "sd23", section: "Seller Disclosures - Questionnaires", name: "[SPQ] Seller Property Questionnaire", required: true },
  // Seller Disclosures - Inspection Reports
  { id: "sd24", section: "Seller Disclosures - Inspection Reports", name: "Home Inspection", required: true },
  { id: "sd25", section: "Seller Disclosures - Inspection Reports", name: "Pest Inspection", required: true },
  { id: "sd26", section: "Seller Disclosures - Inspection Reports", name: "Other Inspection Reports", required: false },
  // Seller Disclosures - Preliminary Title Report
  { id: "sd27", section: "Seller Disclosures - Preliminary Title Report", name: "Preliminary Title Report", required: true },
  { id: "sd28", section: "Seller Disclosures - Preliminary Title Report", name: "Prelim Links (#)", required: true },
  // Seller Disclosures - Property Specific
  { id: "sd29", section: "Seller Disclosures - Property Specific", name: "[NHD] Natural Hazard Disclosure Report", required: true },
  { id: "sd30", section: "Seller Disclosures - Property Specific", name: "[SFLS] Square Footage and Lot Size Advisory", required: true },
  { id: "sd31", section: "Seller Disclosures - Property Specific", name: "Realist Property Details", required: true },
  // Seller Disclosures - Standard
  { id: "sd32", section: "Seller Disclosures - Standard", name: "[MCA] Market Conditions Advisory", required: true },
  { id: "sd33", section: "Seller Disclosures - Standard", name: "[SBSA] Statewide Buyer & Seller Advisory", required: true },
  { id: "sd34", section: "Seller Disclosures - Standard", name: "County Disclosures and Disclaimers Advisory", required: true },
  { id: "sd35", section: "Seller Disclosures - Standard", name: "[WFDA] Wildfire Disaster Advisory", required: true },
  { id: "sd36", section: "Seller Disclosures - Standard", name: "[Compass ABAD] Affiliated Business Arrangement Disclosure", required: true },
  { id: "sd37", section: "Seller Disclosures - Standard", name: "[Compass EHA] Environmental Hazards Advisory", required: true },
  { id: "sd38", section: "Seller Disclosures - Standard", name: "[Compass PTR] Buyer Preliminary Title Report (PTR) Advisory", required: true },
  { id: "sd39", section: "Seller Disclosures - Standard", name: "[Compass RFL] Receipt to Links for Booklets", required: true },
  { id: "sd40", section: "Seller Disclosures - Standard", name: "[Compass WRSC] California Water Restrictions, Shortages, and Conservation Advisory", required: true },
  // Buyer Inspection Reports
  { id: "sd41", section: "Buyer Inspection Reports", name: "Buyer's Home Inspection", required: true },
  { id: "sd42", section: "Buyer Inspection Reports", name: "Buyer's Pest Inspection", required: true },
  { id: "sd43", section: "Buyer Inspection Reports", name: "[BIW] Buyer Inspection Waiver", required: false },
  { id: "sd44", section: "Buyer Inspection Reports", name: "Additional Buyer Inspection Reports", required: false },
  // Other In-Escrow Disclosures and Reports
  { id: "sd45", section: "Other In-Escrow Disclosures and Reports", name: "[Updated Prelim] Updated Preliminary Title Report", required: true },
  { id: "sd46", section: "Other In-Escrow Disclosures and Reports", name: "[AVID] Agent Visual Inspection Disclosure - Buyer's Agent", required: true },
  { id: "sd47", section: "Other In-Escrow Disclosures and Reports", name: "[CMA] Comparative Market Analysis", required: false, note: "Buyer files only" },
  // Contingencies
  { id: "sd48", section: "Contingencies", name: "Investigation", required: true },
  { id: "sd49", section: "Contingencies", name: "Insurance", required: true },
  { id: "sd50", section: "Contingencies", name: "Review of Seller Documents", required: true },
  { id: "sd51", section: "Contingencies", name: "Review of Prelim", required: true },
  { id: "sd52", section: "Contingencies", name: "Review of Common Interest Disclosures", required: true },
  { id: "sd53", section: "Contingencies", name: "Appraisal", required: true },
  { id: "sd54", section: "Contingencies", name: "Loan", required: true },
  { id: "sd55", section: "Contingencies", name: "Other Contingencies", required: false },
  { id: "sd56", section: "Contingencies", name: "Full Contingency Removals", required: true },
  // Final Contract Documents
  { id: "sd57", section: "Final Contract Documents", name: "Home Warranty Order Verification", required: true },
  { id: "sd58", section: "Final Contract Documents", name: "[VP] Verification of Property Condition", required: true },
  { id: "sd59", section: "Final Contract Documents", name: "Title Verification of FIRPTA/QS/AS-FIRPTA", required: true },
  { id: "sd60", section: "Final Contract Documents", name: "Final Settlement Statement", required: true },
];

const noActions: RuleDocumentAction[] = [];

export const conditionalFormattingRules: ConditionalFormattingRule[] = [
  // Baseline standard checklists
  {
    id: "cfr-std-listing",
    name: "Standard Listing Checklist",
    kind: "standard",
    triggers: [{ field: "transactionType", value: "Listing" }],
    documents: standardListingDocs,
    actions: noActions,
    isActive: true,
    createdAt: "2026-04-15",
    transactionType: "Listing",
    propertyType: "Any",
  },
  {
    id: "cfr-std-buyer",
    name: "Standard Buyer File Checklist",
    kind: "standard",
    triggers: [{ field: "transactionType", value: "Buyer File" }],
    documents: standardListingDocs.filter(d =>
      ["Buyer Inspection Reports", "Other In-Escrow Disclosures and Reports", "Contingencies", "Final Contract Documents"].includes(d.section || "")
    ).map(d => ({ ...d, id: `b-${d.id}` })),
    actions: noActions,
    isActive: true,
    createdAt: "2026-04-15",
    transactionType: "Buyer File",
    propertyType: "Any",
  },
  // Conditional overlays from client sheet
  {
    id: "cfr-cond-exempt-seller",
    name: 'When "Exempt Seller" is Yes',
    kind: "conditional",
    triggers: [{ field: "exemptSeller", value: "Yes" }],
    documents: [],
    actions: [
      { id: "a1", documentName: "[ESD] Exempt Seller Disclosure", action: "add-required" },
      { id: "a2", documentName: "[WCMD] Water Conserving Plumbing Fixtures & Carbon Monoxide Notice", action: "add-required" },
      { id: "a3", documentName: "[WHSD] Water Heater and Smoke Detector Disclosure", action: "add-required" },
      { id: "a4", documentName: "[TA] Trust Advisory", action: "add-required", note: "if Seller Entity is also a Trust" },
      { id: "a5", documentName: "[TDS] Transfer Disclosure Statement", action: "mark-na" },
      { id: "a6", documentName: "[SPQ] Seller Property Questionnaire", action: "mark-na" },
      { id: "a7", documentName: "Residential Earthquake Risk Disclosure Statement", action: "mark-na" },
      { id: "a8", documentName: "[FHDS] Fire Hazard and Defensible Space Disclosure and Addendum", action: "mark-na" },
    ],
    isActive: true,
    createdAt: "2026-04-15",
  },
  {
    id: "cfr-cond-hoa",
    name: 'When "HOA" is Yes',
    kind: "conditional",
    triggers: [{ field: "hoa", value: "Yes" }],
    documents: [],
    actions: [
      { id: "h1", documentName: "HOA Documents (#)", action: "add-required" },
      { id: "h2", documentName: "HOA-IR", action: "add-required" },
      { id: "h3", documentName: "HOA-RS", action: "add-required" },
      { id: "h4", documentName: "HOA-RN", action: "add-required" },
      { id: "h5", documentName: "[BHAA] Buyer's Homeowners Association Advisory", action: "add-required" },
    ],
    isActive: true,
    createdAt: "2026-04-15",
  },
  {
    id: "cfr-cond-tenant",
    name: 'When "Tenant Occupied" is Yes',
    kind: "conditional",
    triggers: [{ field: "tenantOccupied", value: "Yes" }],
    documents: [],
    actions: [
      { id: "t1", documentName: "[KLA] Keysafe and Lockbox Addendum (signed by tenant)", action: "add-required", note: "Listing Files only" },
      { id: "t2", documentName: "Tenant Acknowledgement of Obligation to Secure Belongings (signed by Tenant)", action: "add-required", note: "Listing Files only" },
      { id: "t3", documentName: "[TOPA] Tenant Occupied Property Addendum", action: "add-required" },
      { id: "t4", documentName: "[TEC] Tenant Estoppel Certificate", action: "add-required", note: "if Tenant will stay in place at COE" },
    ],
    isActive: true,
    createdAt: "2026-04-15",
  },
  {
    id: "cfr-cond-vacant-land",
    name: 'When Property Type is "Vacant Land"',
    kind: "conditional",
    triggers: [{ field: "propertyType", value: "Vacant Land" }],
    documents: [],
    actions: [
      { id: "v1", documentName: "[TDS] Transfer Disclosure Statement", action: "mark-na" },
      { id: "v2", documentName: "[SPQ] Seller Property Questionnaire", action: "mark-na" },
      { id: "v3", documentName: "Residential Earthquake Risk Disclosure Statement", action: "mark-na" },
      { id: "v4", documentName: "[FHDS] Fire Hazard and Defensible Space Disclosure and Addendum", action: "mark-na" },
      { id: "v5", documentName: "[RLA] Residential Listing Agreement", action: "mark-na" },
      { id: "v6", documentName: "[SA] Seller's Advisory", action: "mark-na" },
      { id: "v7", documentName: "[VLLA] Vacant Land Listing Agreement", action: "add-required" },
      { id: "v8", documentName: "[SVLA] Seller Vacant Land Advisory", action: "add-required" },
      { id: "v9", documentName: "[RPA] Residential Purchase Agreement", action: "mark-na" },
      { id: "v10", documentName: "[BIA] Buyer Inspection Advisory", action: "mark-na" },
      { id: "v11", documentName: "[VLPA] Vacant Land Purchase Agreement", action: "add-required" },
      { id: "v12", documentName: "[BVLIA] Buyer's Additional Vacant Land Inspection Advisory", action: "add-required" },
    ],
    isActive: true,
    createdAt: "2026-04-15",
  },
  {
    id: "cfr-cond-marin",
    name: 'When County is "Marin"',
    kind: "conditional",
    triggers: [{ field: "county", value: "Marin" }],
    documents: [],
    actions: [
      { id: "m1", documentName: "City Re-Sale Inspection Report", action: "add-required" },
      { id: "m2", documentName: "Corte Madera/Larkspur Central Marin Fire Property Resale Inspection Program", action: "add-required" },
      { id: "m3", documentName: "Fire Inspection (San Anselmo/Fairfax)", action: "add-required" },
      { id: "m4", documentName: "Sewer Lateral", action: "add-required" },
      { id: "m5", documentName: "Water Cert", action: "add-required" },
    ],
    isActive: true,
    createdAt: "2026-04-15",
  },
  {
    id: "cfr-cond-dual-agency",
    name: "When Dual Agency is Yes",
    kind: "conditional",
    triggers: [{ field: "dualAgency", value: "Yes" }],
    documents: [],
    actions: [
      { id: "da1", documentName: "Buyer CMA", action: "add-required" },
      { id: "da2", documentName: "[BRBC] Buyer Representation and Broker Compensation Agreement", action: "add-required" },
      { id: "da3", documentName: "Buyer's Affirmation Regarding Other Representation Agreements", action: "add-required" },
      { id: "da4", documentName: "[BCA] Broker Compensation Advisory", action: "add-required" },
    ],
    isActive: true,
    createdAt: "2026-04-15",
  },
];

export const clients: Client[] = [
  {
    id: "c1",
    name: "Sarah Mitchell",
    email: "sarah.mitchell@realty.com",
    phone: "(310) 555-0142",
    company: "Pacific Coast Realty",
    role: "Listing Agent",
    status: "Active",
    propertyAddress: "1247 Ocean View Dr",
    city: "Malibu",
    state: "CA",
    zip: "90265",
    notes: "Prefers email communication. Very responsive.",
    createdAt: "2026-01-15",
    projectCount: 3,
  },
  {
    id: "c2",
    name: "David Chen",
    email: "dchen@homestead.com",
    phone: "(626) 555-0198",
    company: "Homestead Properties",
    role: "Buyer's Agent",
    status: "Active",
    propertyAddress: "892 Maple St",
    city: "Pasadena",
    state: "CA",
    zip: "91101",
    notes: "Has 2 active transactions. Needs frequent updates.",
    createdAt: "2026-01-20",
    projectCount: 2,
  },
  {
    id: "c3",
    name: "Maria Rodriguez",
    email: "maria.r@sunsetrealty.com",
    phone: "(818) 555-0267",
    company: "Sunset Realty Group",
    role: "Listing Agent",
    status: "Active",
    propertyAddress: "5621 Sunset Blvd",
    city: "Los Angeles",
    state: "CA",
    zip: "90028",
    notes: "High-volume agent, sends docs quickly.",
    createdAt: "2025-12-10",
    projectCount: 5,
  },
  {
    id: "c4",
    name: "James Thompson",
    email: "jthompson@elitehomes.com",
    phone: "(949) 555-0334",
    company: "Elite Homes",
    role: "Buyer's Agent",
    status: "Active",
    propertyAddress: "3400 Newport Coast Dr",
    city: "Newport Beach",
    state: "CA",
    zip: "92657",
    notes: "Luxury segment. Prefers phone calls.",
    createdAt: "2026-02-01",
    projectCount: 1,
  },
  {
    id: "c5",
    name: "Lisa Park",
    email: "lisa.park@coastalre.com",
    phone: "(562) 555-0411",
    company: "Coastal Real Estate",
    role: "Listing Agent",
    status: "Inactive",
    propertyAddress: "780 Pacific Ave",
    city: "Long Beach",
    state: "CA",
    zip: "90802",
    notes: "Previous client. Closed 2 deals successfully.",
    createdAt: "2025-09-05",
    projectCount: 0,
  },
  {
    id: "c6",
    name: "Robert Kim",
    email: "rkim@premierprop.com",
    phone: "(213) 555-0578",
    company: "Premier Properties",
    role: "Listing Agent",
    status: "Prospect",
    propertyAddress: "",
    city: "Los Angeles",
    state: "CA",
    zip: "90012",
    notes: "Referred by Maria Rodriguez. Initial meeting scheduled.",
    createdAt: "2026-02-18",
    projectCount: 0,
  },
];

const createDocuments = (type: ProjectType): ProjectDocument[] => {
  const baseDocs = [
    { id: "d1", name: "Listing Agreement", status: "Complete", required: type === "Seller Listing", notes: [{ date: "2026-02-10", text: "Received signed copy from agent", author: "Kathryn" }] },
    { id: "d2", name: "Agency Disclosure", status: "Signed", required: true, notes: [] },
    { id: "d3", name: "Transfer Disclosure Statement (TDS)", status: "Out for Signature", required: type !== "Buyer Representation", notes: [{ date: "2026-02-15", text: "Sent to seller for completion", author: "Kathryn" }] },
    { id: "d4", name: "Seller Property Questionnaire (SPQ)", status: "Pending", required: type === "Seller Listing", notes: [] },
    { id: "d5", name: "Natural Hazard Disclosure (NHD)", status: "Needs Signature", required: true, notes: [{ date: "2026-02-18", text: "Ordered from NHD company, waiting on report", author: "Kathryn" }] },
    { id: "d6", name: "Preliminary Title Report", status: "Uploaded", required: true, uploadedFile: "prelim_title_1247ocean.pdf", notes: [] },
    { id: "d7", name: "Purchase Agreement", status: "Pending", required: true, notes: [] },
    { id: "d8", name: "Buyer Pre-Approval Letter", status: "Pending", required: type === "Buyer Representation", notes: [] },
    { id: "d9", name: "Home Inspection Report", status: "Pending", required: true, notes: [] },
    { id: "d10", name: "Pest Inspection Report", status: "Pending", required: true, notes: [] },
    { id: "d11", name: "Appraisal Report", status: "Pending", required: true, notes: [] },
    { id: "d12", name: "Escrow Instructions", status: "Pending", required: true, notes: [] },
    { id: "d13", name: "HOA Documents", status: "Pending", required: false, notes: [] },
    { id: "d14", name: "Lead-Based Paint Disclosure", status: "Pending", required: false, notes: [{ date: "2026-02-12", text: "Property built after 1978 - may not be required", author: "Kathryn" }] },
    { id: "d15", name: "Wire Fraud Advisory", status: "Complete", required: true, notes: [] },
  ];
  return baseDocs
    .filter(d => d.required || Math.random() > 0.5)
    .map(d => ({ ...d, attachedFileIds: [] as string[] }));
};

const createTasks = (stage: ProjectStage): ProjectTask[] => {
  const allTasks: ProjectTask[] = [
    { id: "t1", title: "Collect listing agreement", stage: "Listing Prep", status: stage === "Listing Prep" ? "In Progress" : "Complete", dueDate: "2026-02-12" },
    { id: "t2", title: "Order NHD report", stage: "Listing Prep", status: stage === "Listing Prep" ? "Pending" : "Complete", dueDate: "2026-02-14" },
    { id: "t3", title: "Send agency disclosures", stage: "Listing Prep", status: "Complete", dueDate: "2026-02-10" },
    { id: "t4", title: "Review MLS listing", stage: "Listing Complete", status: stage === "Listing Complete" ? "In Progress" : "Pending", dueDate: "2026-02-20" },
    { id: "t5", title: "Collect seller disclosures", stage: "Listing Complete", status: "Pending", dueDate: "2026-02-25" },
    { id: "t6", title: "Open escrow", stage: "In Escrow", status: "Pending", dueDate: "2026-03-01" },
    { id: "t7", title: "Schedule home inspection", stage: "In Escrow", status: "Pending", dueDate: "2026-03-05" },
    { id: "t8", title: "Review inspection report", stage: "In Escrow", status: "Pending", dueDate: "2026-03-12" },
    { id: "t9", title: "Track loan contingency removal", stage: "In Escrow", status: "Pending", dueDate: "2026-03-20" },
    { id: "t10", title: "Final walkthrough", stage: "Ready to Close", status: "Pending", dueDate: "2026-04-01" },
    { id: "t11", title: "Confirm recording", stage: "Ready to Close", status: "Pending", dueDate: "2026-04-05" },
  ];
  return allTasks;
};

const createAttachments = (projectId: string): FileAttachment[] => {
  if (projectId === "p1") {
    return [
      { id: "a1", name: "listing_agreement_signed.pdf", size: "2.4 MB", uploadedBy: "Kathryn", uploadedAt: "2026-02-10", type: "application/pdf", folderId: "fld-discl" },
      { id: "a2", name: "prelim_title_1247ocean.pdf", size: "1.8 MB", uploadedBy: "Kathryn", uploadedAt: "2026-02-12", type: "application/pdf", folderId: null },
      { id: "a3", name: "property_photos.pdf", size: "5.2 MB", uploadedBy: "Sarah Mitchell", uploadedAt: "2026-02-14", type: "application/pdf", folderId: null },
    ];
  }
  if (projectId === "p2") {
    return [
      { id: "a4", name: "purchase_agreement_draft.pdf", size: "1.1 MB", uploadedBy: "Kathryn", uploadedAt: "2026-02-05", type: "application/pdf", folderId: null },
      { id: "a5", name: "pre_approval_letter.pdf", size: "340 KB", uploadedBy: "David Chen", uploadedAt: "2026-02-06", type: "application/pdf", folderId: null },
    ];
  }
  if (projectId === "p3") {
    return [
      { id: "a6", name: "escrow_instructions_draft.pdf", size: "890 KB", uploadedBy: "Kathryn", uploadedAt: "2026-02-20", type: "application/pdf", folderId: null },
    ];
  }
  return [];
};

export const projects: Project[] = [
  {
    id: "p1",
    name: "1247 Ocean View Dr — Mitchell Listing",
    clientId: "c1",
    clientName: "Sarah Mitchell",
    propertyAddress: "1247 Ocean View Dr, Malibu, CA 90265",
    type: "Seller Listing",
    stage: "Listing Complete",
    nextStep: "Follow up with Sarah on seller disclosures",
    nextStepDate: "2026-02-25",
    yearBuilt: "1995",
    propertyType: "Single Family Residence",
    representationSide: "Seller",
    escrowOfficer: "Jennifer Adams",
    escrowCompany: "First American Title",
    listPrice: "$2,450,000",
    createdAt: "2026-02-10",
    documents: createDocuments("Seller Listing").map(d =>
      d.name === "Preliminary Title Report"
        ? { ...d, attachedFileIds: ["a2"], uploadedFile: "prelim_title_1247ocean.pdf" }
        : d
    ),
    tasks: createTasks("Listing Complete"),
    emails: [
      { id: "e1", subject: "Welcome — New Listing Opened", from: "kathryn@portal.com", to: "sarah.mitchell@realty.com", date: "2026-02-10", body: "Hi Sarah, I've opened a new file for 1247 Ocean View Dr. I'll be sending over the disclosure package shortly.", direction: "outbound" },
      { id: "e2", subject: "Re: Welcome — New Listing Opened", from: "sarah.mitchell@realty.com", to: "kathryn@portal.com", date: "2026-02-11", body: "Thanks Kathryn! I'll get the listing agreement signed today.", direction: "inbound" },
      { id: "e3", subject: "Document Request — Seller Disclosures", from: "kathryn@portal.com", to: "sarah.mitchell@realty.com", date: "2026-02-15", body: "Hi Sarah, just a reminder that we need the TDS and SPQ completed by end of this week.", direction: "outbound" },
    ],
    deadlines: [
      { id: "dl1", title: "Seller Disclosures Due", date: "2026-02-28", type: "deadline" },
      { id: "dl2", title: "NHD Report Expected", date: "2026-02-22", type: "reminder" },
      { id: "dl3", title: "MLS Photos Due", date: "2026-03-01", type: "deadline" },
    ],
    attachments: createAttachments("p1"),
    fileFolders: [{ id: "fld-discl", name: "Disclosures", parentId: null }],
  },
  {
    id: "p2",
    name: "892 Maple St — Chen Purchase",
    clientId: "c2",
    clientName: "David Chen",
    propertyAddress: "892 Maple St, Pasadena, CA 91101",
    type: "Buyer Representation",
    stage: "In Escrow",
    nextStep: "Track inspection contingency removal — due Friday",
    nextStepDate: "2026-02-28",
    yearBuilt: "2003",
    propertyType: "Townhouse",
    representationSide: "Buyer",
    escrowOfficer: "Michael Torres",
    escrowCompany: "Chicago Title",
    listPrice: "$875,000",
    createdAt: "2026-02-05",
    documents: createDocuments("Buyer Representation"),
    tasks: createTasks("In Escrow"),
    emails: [
      { id: "e4", subject: "Escrow Opened — 892 Maple St", from: "kathryn@portal.com", to: "dchen@homestead.com", date: "2026-02-05", body: "Hi David, escrow has been opened with Chicago Title. Michael Torres is your escrow officer.", direction: "outbound" },
    ],
    deadlines: [
      { id: "dl4", title: "Inspection Contingency Removal", date: "2026-02-28", type: "deadline" },
      { id: "dl5", title: "Loan Contingency Removal", date: "2026-03-10", type: "deadline" },
      { id: "dl6", title: "Close of Escrow", date: "2026-03-25", type: "deadline" },
    ],
    attachments: createAttachments("p2"),
    fileFolders: [],
  },
  {
    id: "p3",
    name: "5621 Sunset Blvd — Rodriguez Listing",
    clientId: "c3",
    clientName: "Maria Rodriguez",
    propertyAddress: "5621 Sunset Blvd, Los Angeles, CA 90028",
    type: "Seller Listing",
    stage: "In Escrow",
    nextStep: "Send escrow instructions to both parties",
    nextStepDate: "2026-02-26",
    yearBuilt: "1978",
    propertyType: "Single Family Residence",
    representationSide: "Seller",
    escrowOfficer: "Linda Walsh",
    escrowCompany: "Fidelity National Title",
    listPrice: "$1,150,000",
    createdAt: "2026-01-28",
    documents: createDocuments("Seller Listing"),
    tasks: createTasks("In Escrow"),
    emails: [],
    deadlines: [
      { id: "dl7", title: "Escrow Instructions Due", date: "2026-02-27", type: "deadline" },
      { id: "dl8", title: "Appraisal Scheduled", date: "2026-03-05", type: "reminder" },
    ],
    attachments: createAttachments("p3"),
    fileFolders: [],
  },
  {
    id: "p4",
    name: "3400 Newport Coast — Thompson Buyer",
    clientId: "c4",
    clientName: "James Thompson",
    propertyAddress: "3400 Newport Coast Dr, Newport Beach, CA 92657",
    type: "Buyer Representation",
    stage: "Listing Prep",
    nextStep: "Collect pre-approval letter from buyer's lender",
    nextStepDate: "2026-02-24",
    yearBuilt: "2018",
    propertyType: "Luxury Condo",
    representationSide: "Buyer",
    escrowOfficer: "TBD",
    escrowCompany: "TBD",
    listPrice: "$3,200,000",
    createdAt: "2026-02-20",
    documents: createDocuments("Buyer Representation"),
    tasks: createTasks("Listing Prep"),
    emails: [],
    deadlines: [
      { id: "dl9", title: "Pre-Approval Letter Due", date: "2026-02-26", type: "deadline" },
    ],
    attachments: createAttachments("p4"),
    fileFolders: [],
  },
  {
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
    createdAt: "2026-01-01",
    documents: [],
    tasks: [],
    emails: [],
    deadlines: [],
    attachments: [],
    fileFolders: [],
  },
];

export const calendarEvents: CalendarEvent[] = [
  { id: "ce1", title: "Seller Disclosures Due", date: "2026-02-28", projectId: "p1", projectName: "1247 Ocean View Dr", type: "deadline", propertyAddress: "1247 Ocean View Dr, Malibu" },
  { id: "ce2", title: "NHD Report Expected", date: "2026-02-22", projectId: "p1", projectName: "1247 Ocean View Dr", type: "reminder", propertyAddress: "1247 Ocean View Dr, Malibu" },
  { id: "ce3", title: "MLS Photos Due", date: "2026-03-01", projectId: "p1", projectName: "1247 Ocean View Dr", type: "deadline", propertyAddress: "1247 Ocean View Dr, Malibu" },
  { id: "ce4", title: "Inspection Contingency Removal", date: "2026-02-28", projectId: "p2", projectName: "892 Maple St", type: "deadline", propertyAddress: "892 Maple St, Pasadena" },
  { id: "ce5", title: "Loan Contingency Removal", date: "2026-03-10", projectId: "p2", projectName: "892 Maple St", type: "deadline", propertyAddress: "892 Maple St, Pasadena" },
  { id: "ce6", title: "Close of Escrow", date: "2026-03-25", projectId: "p2", projectName: "892 Maple St", type: "deadline", propertyAddress: "892 Maple St, Pasadena" },
  { id: "ce7", title: "Escrow Instructions Due", date: "2026-02-27", projectId: "p3", projectName: "5621 Sunset Blvd", type: "deadline", propertyAddress: "5621 Sunset Blvd, Los Angeles" },
  { id: "ce8", title: "Appraisal Scheduled", date: "2026-03-05", projectId: "p3", projectName: "5621 Sunset Blvd", type: "reminder", propertyAddress: "5621 Sunset Blvd, Los Angeles" },
  { id: "ce9", title: "Pre-Approval Letter Due", date: "2026-02-26", projectId: "p4", projectName: "3400 Newport Coast", type: "deadline", propertyAddress: "3400 Newport Coast Dr, Newport Beach" },
  { id: "ce10", title: "Follow up with Sarah", date: "2026-02-25", projectId: "p1", projectName: "1247 Ocean View Dr", type: "task", propertyAddress: "1247 Ocean View Dr, Malibu" },
  { id: "ce11", title: "Track inspection contingency", date: "2026-02-28", projectId: "p2", projectName: "892 Maple St", type: "task", propertyAddress: "892 Maple St, Pasadena" },
  { id: "ce12", title: "Send escrow instructions", date: "2026-02-26", projectId: "p3", projectName: "5621 Sunset Blvd", type: "task", propertyAddress: "5621 Sunset Blvd, Los Angeles" },
];

export const teamMembers: TeamMember[] = [
  { id: "tm1", name: "Kathryn Santos", email: "kathryn@portal.com", role: "Admin", status: "Active", joinedAt: "2026-01-01", lastActive: "2026-04-11" },
  { id: "tm2", name: "Jessica Rivera", email: "jessica@portal.com", role: "Coordinator", status: "Active", joinedAt: "2026-03-15", lastActive: "2026-04-10" },
  { id: "tm3", name: "Amanda Lee", email: "amanda@portal.com", role: "Coordinator", status: "Invited", joinedAt: "2026-04-08", lastActive: "" },
];

export const nextStepsDashboard = projects
  .filter(p => isTransactionProject(p) && p.stage !== "Closed")
  .map(p => ({
    projectId: p.id,
    projectName: p.name,
    clientName: p.clientName,
    propertyAddress: p.propertyAddress,
    nextStep: p.nextStep,
    nextStepDate: p.nextStepDate,
    stage: p.stage,
  }))
  .sort((a, b) => new Date(a.nextStepDate).getTime() - new Date(b.nextStepDate).getTime());
