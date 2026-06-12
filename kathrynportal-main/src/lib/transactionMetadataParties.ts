function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Escrow officer from project column, falling back to metadata.escrow (form-saved name). */
export function resolveProjectEscrowOfficer(project: {
  escrowOfficer?: string;
  metadata?: unknown;
}): string {
  const fromColumn = str(project.escrowOfficer);
  if (fromColumn) return fromColumn;
  const escrow = asRecord(asRecord(project.metadata)?.escrow);
  if (!escrow) return "";
  return str(escrow.name) || str(escrow.preferredName);
}

export type PartyRow = { role: string; name: string; preferredName?: string; email?: string };

export type PartyGroup = { title: string; rows: PartyRow[] };

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function asUnknownArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function partyFromRow(row: unknown, role: string): PartyRow | null {
  const o = asRecord(row);
  if (!o) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const preferredName = typeof o.preferredName === "string" ? o.preferredName.trim() : "";
  const email = typeof o.email === "string" ? o.email.trim() : "";
  if (!name && !preferredName && !email) return null;
  return {
    role,
    name: name || preferredName || "—",
    preferredName: preferredName || undefined,
    email: email || undefined,
  };
}

function lenderFromMetadata(lender: unknown): PartyRow | null {
  const o = asRecord(lender);
  if (!o) return null;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const company = typeof o.company === "string" ? o.company.trim() : "";
  if (!name && !company) return null;
  const displayName = name || company;
  const role = company && name ? `Lender · ${company}` : company ? "Lender" : "Lender";
  return { role, name: displayName };
}

function pushGroup(groups: PartyGroup[], title: string, rows: PartyRow[]) {
  if (rows.length === 0) return;
  groups.push({ title, rows });
}

/** Read-only party groups from `project.metadata` (same keys as AddProjectPage). */
export function getTransactionPartyGroups(metadata: Record<string, unknown> | undefined): PartyGroup[] {
  if (!metadata) return [];
  const groups: PartyGroup[] = [];

  const sellerRows = asUnknownArray(metadata.sellers);
  const sellers = sellerRows
    .map((row, i) => partyFromRow(row, sellerRows.length > 1 ? `Seller ${i + 1}` : "Seller"))
    .filter((r): r is PartyRow => r !== null);
  pushGroup(groups, "Sellers", sellers);

  const buyerRows = asUnknownArray(metadata.buyers);
  const buyers = buyerRows
    .map((row, i) => partyFromRow(row, buyerRows.length > 1 ? `Buyer ${i + 1}` : "Buyer"))
    .filter((r): r is PartyRow => r !== null);
  pushGroup(groups, "Buyers", buyers);

  const listingAgentRows = asUnknownArray(metadata.listingAgents);
  const listingAgents = listingAgentRows
    .map((row, i) => partyFromRow(row, i === 0 ? "Listing agent" : `Listing agent ${i + 1}`))
    .filter((r): r is PartyRow => r !== null);
  pushGroup(groups, "Listing agents", listingAgents);

  const buyerAgentRows = asUnknownArray(metadata.buyerAgents);
  const buyerAgents = buyerAgentRows
    .map((row, i) => partyFromRow(row, i === 0 ? "Buyer's agent" : `Buyer's agent ${i + 1}`))
    .filter((r): r is PartyRow => r !== null);
  pushGroup(groups, "Buyer's agents", buyerAgents);

  const extras: PartyRow[] = [];
  const extraKeys: [string, string][] = [
    ["listingAgent3", "Additional listing agent"],
    ["buyerAgent3", "Additional buyer's agent"],
    ["listingAgentTC", "Listing agent TC"],
    ["buyerAgentTC", "Buyer's agent TC"],
    ["listingAgentAssistant", "Listing agent assistant"],
    ["buyerAgentAssistant", "Buyer's agent assistant"],
    ["escrow", "Escrow officer"],
    ["escrowAssistant", "Escrow assistant"],
  ];
  for (const [key, role] of extraKeys) {
    const row = partyFromRow(metadata[key], role);
    if (row) extras.push(row);
  }
  pushGroup(groups, "Escrow & team", extras);

  const lender = lenderFromMetadata(metadata.lender);
  if (lender) pushGroup(groups, "Lender", [lender]);

  return groups;
}
