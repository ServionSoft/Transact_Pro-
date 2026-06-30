import type { Project } from "@/data/mockData";
import { parseTimelineFromMetadata } from "@/lib/transactionTimelineFields";
import { isBuyerTransaction } from "@/lib/transactionListUtils";

function partyNameFromMetadataRow(row: unknown): string {
  if (!row || typeof row !== "object") return "";
  const o = row as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const preferred = typeof o.preferredName === "string" ? o.preferredName.trim() : "";
  return name || preferred;
}

/** Close of escrow from timeline metadata (COP/SPRP). */
export function projectCloseOfEscrowDate(project: Pick<Project, "type" | "metadata">): string {
  const { cop, sprp } = parseTimelineFromMetadata(project.metadata);
  if (isBuyerTransaction(project.type)) return sprp.coe || cop.coe;
  return cop.coe || sprp.coe;
}

/** Primary transaction agent from parties metadata, falling back to assignees. */
export function projectTransactionAgentLabel(project: Project): string {
  const meta = project.metadata;
  if (meta && typeof meta === "object") {
    const key = isBuyerTransaction(project.type) ? "buyerAgents" : "listingAgents";
    const rows = Array.isArray(meta[key]) ? meta[key] : [];
    const first = partyNameFromMetadataRow(rows[0]);
    if (first) return first;
  }
  const assignees = project.assignees ?? [];
  if (assignees.length === 0) return "Unassigned";
  const first = assignees[0]!.name?.trim() || "Team member";
  if (assignees.length === 1) return first;
  return `${first} +${assignees.length - 1}`;
}

/** Latest transaction note body for inline preview on the Next Steps hub. */
export function projectLatestNotePreview(project: Pick<Project, "notes">): string {
  const notes = project.notes ?? [];
  if (notes.length === 0) return "";
  const sorted = [...notes].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return sorted[0]?.body?.trim() ?? "";
}
