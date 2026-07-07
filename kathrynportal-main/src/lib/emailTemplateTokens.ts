import type { Project } from "@/data/mockData";
import type { EmailTemplate } from "@/types/domain";
import { resolveProjectEscrowOfficer } from "@/lib/transactionMetadataParties";
import { projectCloseOfEscrowDate } from "@/lib/nextStepDisplayUtils";
import { buildTimelineTableText } from "@/lib/transactionTimelineFields";
import { isBuyerTransaction } from "@/lib/transactionListUtils";
import {
  buyerAgentTcName,
  firstBuyerAgentName,
  firstBuyerEmail,
  firstBuyerName,
  firstBuyerPhone,
  firstClientPartyEmail,
  firstClientPartyPhone,
  firstClientPartyRow,
  firstListingAgentName,
  listingAgentTcName,
  partyNameFromMetadataRow,
} from "@/lib/transactionEmailPartyTokens";

/** Tokens available in email templates (Settings / Email page). */
export const TRANSACTION_EMAIL_TOKENS = [
  "{{agent_name}}",
  "{{listing_agent_name}}",
  "{{buyer_agent_name}}",
  "{{buyer_agent_tc_name}}",
  "{{listing_agent_tc_name}}",
  "{{client_name}}",
  "{{client_email}}",
  "{{client_phone}}",
  "{{buyer_name}}",
  "{{buyer_email}}",
  "{{buyer_phone}}",
  "{{property_address}}",
  "{{property_street}}",
  "{{property_city}}",
  "{{property_state}}",
  "{{property_zip}}",
  "{{transaction_name}}",
  "{{transaction_type}}",
  "{{stage_name}}",
  "{{deadline_name}}",
  "{{deadline_date}}",
  "{{next_step}}",
  "{{next_step_date}}",
  "{{list_price}}",
  "{{escrow_officer}}",
  "{{escrow_company}}",
  "{{escrow_number}}",
  "{{home_warranty}}",
  "{{coe_date}}",
  "{{other_side_agent_name}}",
  "{{other_side_agent_tc_name}}",
  "{{property_type}}",
  "{{document_list}}",
  "{{missing_documents_list}}",
  "{{timeline_table}}",
  "{{update_details}}",
  "{{disclosure_link}}",
  "{{file_link}}",
  "{{hoa_contact}}",
  "{{today_date}}",
] as const;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escrowNumberFromMetadata(metadata: Record<string, unknown> | undefined): string {
  const tx = metadata?.transaction;
  if (tx && typeof tx === "object" && !Array.isArray(tx)) {
    const v = (tx as Record<string, unknown>).escrowNumber;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "[Escrow #]";
}

function homeWarrantyFromMetadata(metadata: Record<string, unknown> | undefined): string {
  const tx = metadata?.transaction;
  if (tx && typeof tx === "object" && !Array.isArray(tx)) {
    const v = (tx as Record<string, unknown>).homeWarranty;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "[Home warranty details]";
}

export function applyEmailTemplateTokens(input: string, tokenMap: Record<string, string>): string {
  let out = input.replace(/\\n/g, "\n");
  for (const [key, value] of Object.entries(tokenMap)) {
    const re = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, "gi");
    out = out.replace(re, value);
  }
  return out;
}

export function buildTransactionDocumentList(
  project?: Pick<Project, "documents"> | null
): string {
  if (!project?.documents || project.documents.length === 0) return "• [Documents listed here]";
  const pending = project.documents.filter((d) => d.status !== "Completed" && d.status !== "Complete");
  const source = pending.length > 0 ? pending : project.documents;
  const lines = source.slice(0, 10).map((d) => `• ${d.name}`);
  return lines.length > 0 ? lines.join("\n") : "• [Documents listed here]";
}

export function buildTransactionEmailTokenMap(
  project: Project,
  client?: { name?: string } | null,
  documentListOverride?: string,
  timelineTableOverride?: string,
): Record<string, string> {
  const parts = (project.propertyAddress || "").split(",").map((x) => x.trim());
  const metadata =
    project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
      ? (project.metadata as Record<string, unknown>)
      : undefined;
  const isBuyer = isBuyerTransaction(project.type);
  const listingAgent = firstListingAgentName(metadata);
  const buyerAgent = firstBuyerAgentName(metadata);
  const primaryAgent = isBuyer
    ? buyerAgent || client?.name || project.clientName || ""
    : listingAgent || client?.name || project.clientName || "";
  const otherSideAgent = isBuyer ? listingAgent : buyerAgent;
  const otherSideAgentTc = isBuyer
    ? listingAgentTcName(metadata)
    : buyerAgentTcName(metadata);
  const clientEmail =
    firstClientPartyEmail(metadata, isBuyer) ||
    client?.email?.trim() ||
    "[Client email]";
  const clientPhone = firstClientPartyPhone(metadata, isBuyer) || "[Client phone]";
  const buyerName = isBuyer
    ? project.clientName || partyNameFromMetadataRow(firstClientPartyRow(metadata, true))
    : firstBuyerName(metadata) || "[Buyer name(s)]";
  const buyerEmail = isBuyer
    ? firstClientPartyEmail(metadata, true) || client?.email?.trim() || "[Buyer email]"
    : firstBuyerEmail(metadata) || "[Buyer email]";
  const buyerPhone = isBuyer
    ? firstClientPartyPhone(metadata, true) || "[Buyer phone]"
    : firstBuyerPhone(metadata);
  const docList = documentListOverride ?? buildTransactionDocumentList(project);
  return {
    agent_name: primaryAgent,
    listing_agent_name: listingAgent || "[Listing agent]",
    buyer_agent_name: buyerAgent || "[Buyer's agent]",
    buyer_agent_tc_name: buyerAgentTcName(metadata) || "BATC",
    listing_agent_tc_name: listingAgentTcName(metadata) || listingAgent || "[Listing agent TC]",
    other_side_agent_name: otherSideAgent || "[Other agent]",
    other_side_agent_tc_name: otherSideAgentTc || "[Other agent TC]",
    client_name: project.clientName || "",
    client_email: clientEmail,
    client_phone: clientPhone,
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    buyer_phone: buyerPhone,
    property_address: project.propertyAddress || "",
    property_street: parts[0] || "",
    property_city: parts[1] || "",
    property_state: parts[2] || "",
    property_zip: parts[3] || "",
    transaction_name: project.name || "",
    transaction_type: project.type || "",
    stage_name: project.stage || "",
    deadline_name: project.nextStep || "Next deadline",
    deadline_date: project.nextStepDate || "TBD",
    next_step: project.nextStep || "",
    next_step_date: project.nextStepDate || "",
    list_price: project.listPrice || "",
    escrow_officer: resolveProjectEscrowOfficer(project),
    escrow_company: project.escrowCompany || "",
    escrow_number: escrowNumberFromMetadata(metadata),
    home_warranty: homeWarrantyFromMetadata(metadata),
    coe_date: projectCloseOfEscrowDate(project) || "TBD",
    property_type: project.propertyType || "",
    document_list: docList,
    missing_documents_list: docList,
    timeline_table:
      timelineTableOverride ?? buildTimelineTableText(metadata, project.deadlines ?? []),
    update_details: "[Update details here]",
    disclosure_link: "[Paste Glide disclosure share link]",
    file_link: "[Paste link to file documents]",
    hoa_contact: "[HOA contact name]",
    today_date: new Date().toLocaleDateString(),
  };
}

export function applyTransactionTokensToEmailFields(
  subject: string,
  body: string,
  project: Project,
  client?: { name?: string; email?: string } | null,
  documentListOverride?: string,
  timelineTableOverride?: string,
): { subject: string; body: string } {
  const tokenMap = buildTransactionEmailTokenMap(
    project,
    client,
    documentListOverride,
    timelineTableOverride,
  );
  return {
    subject: applyEmailTemplateTokens(subject, tokenMap),
    body: applyEmailTemplateTokens(body, tokenMap),
  };
}

export function applyEmailTemplateToCompose(
  template: EmailTemplate,
  project: Project,
  client?: { name?: string } | null,
  documentListOverride?: string,
  timelineTableOverride?: string
): { subject: string; body: string } {
  const tokenMap = buildTransactionEmailTokenMap(project, client, documentListOverride, timelineTableOverride);
  return {
    subject: applyEmailTemplateTokens(template.subject, tokenMap),
    body: applyEmailTemplateTokens(template.body, tokenMap),
  };
}

export function findTimelineEmailTemplate(templates: EmailTemplate[]): EmailTemplate | undefined {
  return (
    templates.find((t) => /\{\{\s*timeline_table\s*\}\}/i.test(t.body)) ||
    templates.find((t) => /timeline/i.test(t.name))
  );
}

export function buildTimelineEmailComposePrefill(
  project: Project,
  client?: { name?: string; email?: string } | null,
  templates: EmailTemplate[] = [],
): { subject: string; body: string; templateId?: string } {
  const street = (project.propertyAddress || "").split(",")[0]?.trim() || project.name || "Transaction";
  const timelineTable = buildTimelineTableText(
    project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
      ? (project.metadata as Record<string, unknown>)
      : undefined,
    project.deadlines ?? [],
  );
  const tpl = findTimelineEmailTemplate(templates);
  if (tpl) {
    const applied = applyEmailTemplateToCompose(tpl, project, client);
    return { subject: applied.subject, body: applied.body, templateId: tpl.id };
  }
  return {
    subject: `Timeline — ${street}`,
    body: `Hi,\n\nPlease find the transaction timeline for ${project.propertyAddress || street} below:\n\n${timelineTable}\n\nBest regards,`,
  };
}
