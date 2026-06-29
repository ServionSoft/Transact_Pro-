const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailAddress(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Accept string (comma/semicolon separated) or string[]. Returns normalized unique emails. */
export function parseEmailAddressList(input: unknown): string[] {
  const raw: string[] = [];
  if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === "string") raw.push(item);
    }
  } else if (typeof input === "string") {
    raw.push(input);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const chunk of raw) {
    for (const part of chunk.split(/[,;]+/)) {
      const email = part.trim().toLowerCase();
      if (!email || !isValidEmailAddress(email) || seen.has(email)) continue;
      seen.add(email);
      out.push(email);
    }
  }
  return out;
}

export function formatEmailAddressList(emails: string[]): string {
  return emails.join(", ");
}
