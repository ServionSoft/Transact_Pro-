import type { Project } from "@/data/mockData";
import type { EmailTemplate } from "@/types/domain";
import { resolveProjectEscrowOfficer } from "@/lib/transactionMetadataParties";
import { buildTimelineTableText } from "@/lib/transactionTimelineFields";
import { isBuyerTransaction } from "@/lib/transactionListUtils";
import {
  buyerAgentTcName,
  firstBuyerAgentName,
  firstListingAgentName,
  listingAgentTcName,
} from "@/lib/transactionEmailPartyTokens";

/** Tokens available in email templates (Settings / Email page). */
export const TRANSACTION_EMAIL_TOKENS = [
  "{{agent_name}}",
  "{{listing_agent_name}}",
  "{{buyer_agent_name}}",
  "{{buyer_agent_tc_name}}",
  "{{listing_agent_tc_name}}",
  "{{client_name}}",
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
  "{{property_type}}",
  "{{document_list}}",
  "{{missing_documents_list}}",
  "{{timeline_table}}",
  "{{update_details}}",
  "{{disclosure_link}}",
  "{{hoa_contact}}",
  "{{today_date}}",
] as const;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  const listingAgent = firstListingAgentName(metadata);
  const buyerAgent = firstBuyerAgentName(metadata);
  const primaryAgent = isBuyerTransaction(project.type)
    ? buyerAgent || client?.name || project.clientName || ""
    : listingAgent || client?.name || project.clientName || "";
  const docList = documentListOverride ?? buildTransactionDocumentList(project);
  return {
    agent_name: primaryAgent,
    listing_agent_name: listingAgent || "[Listing agent]",
    buyer_agent_name: buyerAgent || "[Buyer's agent]",
    buyer_agent_tc_name: buyerAgentTcName(metadata) || "BATC",
    listing_agent_tc_name: listingAgentTcName(metadata) || listingAgent || "[Listing agent TC]",
    client_name: project.clientName || "",
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
    property_type: project.propertyType || "",
    document_list: docList,
    missing_documents_list: docList,
    timeline_table:
      timelineTableOverride ?? buildTimelineTableText(metadata, project.deadlines ?? []),
    update_details: "[Update details here]",
    disclosure_link: "[Paste Glide disclosure share link]",
    hoa_contact: "[HOA contact name]",
    today_date: new Date().toLocaleDateString(),
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
