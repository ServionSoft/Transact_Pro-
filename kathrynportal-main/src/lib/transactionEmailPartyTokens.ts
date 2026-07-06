function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function asUnknownArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Name from a parties metadata row (sellers, listingAgents, buyerAgentTC, etc.). */
export function partyNameFromMetadataRow(row: unknown): string {
  const o = asRecord(row);
  if (!o) return "";
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const preferred = typeof o.preferredName === "string" ? o.preferredName.trim() : "";
  return name || preferred;
}

export function firstListingAgentName(metadata: Record<string, unknown> | undefined): string {
  const rows = asUnknownArray(metadata?.listingAgents);
  return partyNameFromMetadataRow(rows[0]);
}

export function firstBuyerAgentName(metadata: Record<string, unknown> | undefined): string {
  const rows = asUnknownArray(metadata?.buyerAgents);
  return partyNameFromMetadataRow(rows[0]);
}

export function buyerAgentTcName(metadata: Record<string, unknown> | undefined): string {
  const fromTc = partyNameFromMetadataRow(metadata?.buyerAgentTC);
  if (fromTc) return fromTc;
  return firstBuyerAgentName(metadata);
}

export function listingAgentTcName(metadata: Record<string, unknown> | undefined): string {
  const fromTc = partyNameFromMetadataRow(metadata?.listingAgentTC);
  if (fromTc) return fromTc;
  return firstListingAgentName(metadata);
}
