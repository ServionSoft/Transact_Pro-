import type { Project } from "@/data/mockData";
import type { EmailTemplate } from "@/types/domain";

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
  documentListOverride?: string
): Record<string, string> {
  const parts = (project.propertyAddress || "").split(",").map((x) => x.trim());
  return {
    agent_name: client?.name || project.clientName || "",
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
    escrow_officer: project.escrowOfficer || "",
    escrow_company: project.escrowCompany || "",
    property_type: project.propertyType || "",
    document_list: documentListOverride ?? buildTransactionDocumentList(project),
    update_details: "[Update details here]",
    today_date: new Date().toLocaleDateString(),
  };
}

export function applyEmailTemplateToCompose(
  template: EmailTemplate,
  project: Project,
  client?: { name?: string } | null,
  documentListOverride?: string
): { subject: string; body: string } {
  const tokenMap = buildTransactionEmailTokenMap(project, client, documentListOverride);
  return {
    subject: applyEmailTemplateTokens(template.subject, tokenMap),
    body: applyEmailTemplateTokens(template.body, tokenMap),
  };
}
