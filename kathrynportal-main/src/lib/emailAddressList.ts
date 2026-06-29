const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailAddress(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function normalizeEmailAddress(value: string): string {
  return value.trim().toLowerCase();
}

export function parseEmailAddressList(input: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of input.split(/[,;]+/)) {
    const email = normalizeEmailAddress(part);
    if (!email || !isValidEmailAddress(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function formatEmailAddressList(emails: string[]): string {
  return emails.join(", ");
}
