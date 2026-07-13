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

/**
 * First name for greetings. Prefers the explicit `firstName` field, then the
 * preferred name, then the first token of the combined name.
 */
export function partyFirstNameFromMetadataRow(row: unknown): string {
  const o = asRecord(row);
  if (!o) return "";
  const first = typeof o.firstName === "string" ? o.firstName.trim() : "";
  if (first) return first;
  const preferred = typeof o.preferredName === "string" ? o.preferredName.trim() : "";
  if (preferred) return preferred;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  return name ? name.split(/\s+/)[0] : "";
}

function partyFieldFromMetadataRow(row: unknown, field: "email" | "phone"): string {
  const o = asRecord(row);
  if (!o) return "";
  const v = typeof o[field] === "string" ? o[field].trim() : "";
  return v;
}

/** First seller or buyer row from metadata (primary client party on the file). */
export function firstClientPartyRow(
  metadata: Record<string, unknown> | undefined,
  isBuyerFile: boolean
): unknown {
  const key = isBuyerFile ? "buyers" : "sellers";
  const rows = asUnknownArray(metadata?.[key]);
  return rows[0];
}

export function firstClientPartyEmail(
  metadata: Record<string, unknown> | undefined,
  isBuyerFile: boolean
): string {
  return partyFieldFromMetadataRow(firstClientPartyRow(metadata, isBuyerFile), "email");
}

export function firstClientPartyPhone(
  metadata: Record<string, unknown> | undefined,
  isBuyerFile: boolean
): string {
  return partyFieldFromMetadataRow(firstClientPartyRow(metadata, isBuyerFile), "phone");
}

/** First buyer row from metadata (for warranty orders on listing files). */
export function firstBuyerPartyRow(metadata: Record<string, unknown> | undefined): unknown {
  const rows = asUnknownArray(metadata?.buyers);
  return rows[0];
}

export function firstBuyerName(metadata: Record<string, unknown> | undefined): string {
  return partyNameFromMetadataRow(firstBuyerPartyRow(metadata));
}

export function firstBuyerEmail(metadata: Record<string, unknown> | undefined): string {
  return partyFieldFromMetadataRow(firstBuyerPartyRow(metadata), "email");
}

export function firstBuyerPhone(metadata: Record<string, unknown> | undefined): string {
  const phone = partyFieldFromMetadataRow(firstBuyerPartyRow(metadata), "phone");
  return phone || "555-5555";
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
