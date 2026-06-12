export type SellerMatchYesNo = "yes" | "no" | "";

export function normalizeSellerName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function autoSellerNameMatch(sourceA: string, sourceB: string): SellerMatchYesNo {
  if (!sourceA.trim() || !sourceB.trim()) return "";
  return normalizeSellerName(sourceA) === normalizeSellerName(sourceB) ? "yes" : "no";
}

export function resolveSellerNameMatchStatus(
  override: string,
  sourceA: string,
  sourceB: string,
): SellerMatchYesNo {
  if (override === "yes" || override === "no") return override;
  return autoSellerNameMatch(sourceA, sourceB);
}

export function formatSellerMatchLabel(status: SellerMatchYesNo): "Yes" | "No" | "Pending" {
  if (status === "yes") return "Yes";
  if (status === "no") return "No";
  return "Pending";
}

export function resolveEffectiveSellerMatchLabel(
  override: string,
  sourceA: string,
  sourceB: string,
): "Yes" | "No" | "Pending" {
  return formatSellerMatchLabel(resolveSellerNameMatchStatus(override, sourceA, sourceB));
}
