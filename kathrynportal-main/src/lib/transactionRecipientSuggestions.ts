import type { Client, Project } from "@/data/mockData";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type TransactionRecipientSuggestion = { email: string; label: string };

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function asUnknownArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Name + email shape saved under `project.metadata` from the new-transaction form. */
function partyEmailName(row: unknown): { email: string; name: string } | null {
  const o = asRecord(row);
  if (!o) return null;
  const email = typeof o.email === "string" ? o.email.trim() : "";
  const legalName = typeof o.name === "string" ? o.name.trim() : "";
  const preferredName = typeof o.preferredName === "string" ? o.preferredName.trim() : "";
  const name = preferredName || legalName;
  if (!email) return null;
  return { email, name };
}

/**
 * Emails from `project.metadata` (parties / escrow / agents) — same keys as `AddProjectPage` saves.
 * Order: sellers & buyers, listing & buyer agents (+ extras), TCs & assistants, escrow.
 */
function pushMetadataPartyEmails(
  metadata: Record<string, unknown> | undefined,
  push: (raw: string | undefined | null, label: string) => void,
): void {
  if (!metadata) return;

  const pushRow = (row: unknown, roleLabel: string) => {
    const p = partyEmailName(row);
    if (!p) return;
    push(p.email, p.name ? `${p.name} (${roleLabel})` : roleLabel);
  };

  const sellers = asUnknownArray(metadata.sellers);
  sellers.forEach((row, i) => {
    pushRow(row, sellers.length > 1 ? `Seller ${i + 1}` : "Seller");
  });

  const buyers = asUnknownArray(metadata.buyers);
  buyers.forEach((row, i) => {
    pushRow(row, buyers.length > 1 ? `Buyer ${i + 1}` : "Buyer");
  });

  const listingAgents = asUnknownArray(metadata.listingAgents);
  listingAgents.forEach((row, i) => {
    pushRow(row, i === 0 ? "Listing agent" : `Listing agent ${i + 1}`);
  });

  const buyerAgents = asUnknownArray(metadata.buyerAgents);
  buyerAgents.forEach((row, i) => {
    pushRow(row, i === 0 ? "Buyer's agent" : `Buyer's agent ${i + 1}`);
  });

  pushRow(metadata.buyerAgent3, "Additional buyer's agent");
  pushRow(metadata.listingAgent3, "Additional listing agent");

  pushRow(metadata.buyerAgentTC, "Buyer's agent TC");
  pushRow(metadata.buyerAgentAssistant, "Buyer's agent assistant");
  pushRow(metadata.listingAgentTC, "Listing agent TC");

  pushRow(metadata.escrow, "Escrow officer");
  pushRow(metadata.escrowAssistant, "Escrow assistant");
}

/** Deduped suggestions: contact, transaction parties from metadata, then assigned team (same email once). */
export function getTransactionRecipientSuggestions(
  project: Project | null | undefined,
  client: Client | null | undefined,
): TransactionRecipientSuggestion[] {
  const seen = new Set<string>();
  const out: TransactionRecipientSuggestion[] = [];

  const push = (raw: string | undefined | null, label: string) => {
    const email = raw?.trim() ?? "";
    if (!email || !EMAIL_RE.test(email)) return;
    const lower = email.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    out.push({ email, label });
  };

  const clientName = client?.name?.trim();
  if (client?.email) push(client.email, clientName ? `${clientName} (contact)` : "Contact");

  const md = project?.metadata;
  if (md && typeof md === "object" && !Array.isArray(md)) {
    pushMetadataPartyEmails(md as Record<string, unknown>, push);
  }

  for (const a of project?.assignees ?? []) {
    const e = a.email?.trim();
    if (!e) continue;
    const des = a.designation?.trim();
    const name = a.name?.trim() || "Team member";
    push(e, des ? `${name} (${des})` : `${name} (assignee)`);
  }

  return out;
}
