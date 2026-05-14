/** Keep validation logic aligned with backend/src/utils/parseClientSignerEmails.ts */

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF]/g;

const SUSPICIOUS_TLDS = new Set([
  "comd",
  "comm",
  "coom",
  "cpm",
  "cim",
  "comn",
  "comr",
  "orgg",
  "orrg",
  "omr",
  "ogr",
  "ney",
  "neet",
  "nett",
  "neg",
  "eduu",
]);

const SUSPICIOUS_DOMAINS = new Set([
  "gmai.com",
  "gmial.com",
  "gmal.com",
  "gamil.com",
  "gnail.com",
  "hotnail.com",
  "hotmil.com",
  "yahou.com",
  "yaho.com",
  "outlokk.com",
  "iclod.com",
  "iclould.com",
]);

const MAX_EMAIL_LEN = 254;
const MAX_LOCAL_LEN = 64;

export function parseSignerEmailsFromInput(raw: string): string[] {
  const cleaned = raw.replace(INVISIBLE_CHARS, "").trim();
  if (!cleaned) return [];
  const segments = cleaned.split(/[,\n;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const seg of segments) {
    if (!SIMPLE_EMAIL_RE.test(seg)) continue;
    if (seen.has(seg)) continue;
    seen.add(seg);
    out.push(seg);
  }
  return out;
}

export function validateEmailForDocuSign(email: string): string | null {
  const e = email.trim().toLowerCase();
  if (!SIMPLE_EMAIL_RE.test(e)) {
    return "not a valid email format.";
  }
  if (e.length > MAX_EMAIL_LEN) {
    return "email is too long.";
  }
  const at = e.lastIndexOf("@");
  const local = at > 0 ? e.slice(0, at) : "";
  const domain = at > 0 ? e.slice(at + 1) : "";
  if (!local || !domain || local.length > MAX_LOCAL_LEN) {
    return "invalid local part or domain.";
  }
  if (SUSPICIOUS_DOMAINS.has(domain)) {
    return "domain looks mistyped; check spelling (e.g. gmail.com).";
  }
  const lastDot = domain.lastIndexOf(".");
  const tld = lastDot >= 0 ? domain.slice(lastDot + 1) : "";
  if (!tld || tld.length < 2 || tld.length > 63) {
    return "invalid domain ending.";
  }
  if (!/^[a-z0-9-]+$/i.test(tld)) {
    return "domain ending contains invalid characters.";
  }
  if (SUSPICIOUS_TLDS.has(tld.toLowerCase())) {
    return "domain ending looks mistyped (e.g. .com vs .comd).";
  }
  return null;
}

export function validateSignerEmailListForDocuSign(emails: string[]): { ok: true } | { ok: false; message: string } {
  if (emails.length === 0) {
    return { ok: false, message: "Enter at least one valid email." };
  }
  for (let i = 0; i < emails.length; i++) {
    const err = validateEmailForDocuSign(emails[i]);
    if (err) {
      const role = i === 0 ? "Signer" : `Carbon copy (${i})`;
      return { ok: false, message: `${role}: ${err}` };
    }
  }
  return { ok: true };
}
