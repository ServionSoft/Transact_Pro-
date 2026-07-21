/** Display-only US formatting. Storage stays ISO dates / plain numbers. */

/** Format a date for UI as MM/DD/YYYY. Accepts YYYY-MM-DD or ISO datetime. */
export function formatUsDateDisplay(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "—") return trimmed || "";

  const isoDay = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDay) {
    return `${isoDay[2]}/${isoDay[3]}/${isoDay[1]}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** Format a money amount for UI as $1,250,000. Does not write currency into storage. */
export function formatUsdDisplay(value: string | number | null | undefined): string {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw || raw === "—") return raw === "—" ? "—" : "";
  if (raw.startsWith("$") && /\$[\d,]+(\.\d+)?$/.test(raw)) return raw;

  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned) return raw;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return raw;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
