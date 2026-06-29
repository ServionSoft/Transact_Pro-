import nodemailer from "nodemailer";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { decryptSmtpPassword, deriveSmtpPasswordKeyHex, encryptSmtpPassword } from "../utils/smtpSecretCrypto.js";

/** Key material for decrypting legacy `password_encrypted` rows only. */
function smtpPasswordKeyHex(config: AppConfig): string | null {
  const secret = config.jwtAccessSecret?.trim();
  if (!secret) return null;
  return deriveSmtpPasswordKeyHex(secret);
}

export type SmtpSettingsRow = {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  authUser: string;
  hasPassword: boolean;
  fromEmail: string;
  fromName: string;
  vendorSignatureFileId: string | null;
};

export type SmtpUpsertInput = {
  host: string;
  port: number;
  secure: boolean;
  authUser: string;
  /** When omitted or empty, existing password is kept */
  password?: string | null;
  fromEmail: string;
  fromName: string;
};

export type SmtpTestInput = {
  host: string;
  port: number;
  secure: boolean;
  authUser: string;
  /** Plain password for this test only */
  password?: string | null;
  /** When true and password empty, load password from DB for row built from other fields */
  useStoredPassword?: boolean;
  /** Envelope From (form probe); saved test uses DB row */
  fromEmail?: string;
  fromName?: string;
  /** Recipient for the test message (required to send mail; verify-only if empty) */
  sendTestEmailTo?: string;
};

function rowToPublic(r: {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  auth_user: string;
  from_email: string;
  from_name: string;
  has_password: boolean;
  vendor_signature_file_id: string | null;
}): SmtpSettingsRow {
  return {
    id: r.id,
    host: r.host ?? "",
    port: Number(r.port) || 587,
    secure: Boolean(r.secure),
    authUser: r.auth_user ?? "",
    hasPassword: Boolean(r.has_password),
    fromEmail: r.from_email ?? "",
    fromName: r.from_name ?? "",
    vendorSignatureFileId: r.vendor_signature_file_id,
  };
}

export async function getSmtpSettings(pool: Pool): Promise<SmtpSettingsRow> {
  const { rows } = await pool.query<{
    id: string;
    host: string;
    port: number;
    secure: boolean;
    auth_user: string;
    from_email: string;
    from_name: string;
    vendor_signature_file_id: string | null;
    has_password: boolean;
  }>(
    `SELECT id::text, host, port, secure, auth_user, from_email, from_name,
            vendor_signature_file_id::text AS vendor_signature_file_id,
            (
              (smtp_password IS NOT NULL AND length(btrim(smtp_password)) > 0)
              OR (password_encrypted IS NOT NULL AND length(btrim(password_encrypted::text)) > 0)
            ) AS has_password
     FROM public.smtp_settings WHERE id = 1 LIMIT 1`
  );
  const r = rows[0];
  if (!r) {
    return {
      id: "1",
      host: "",
      port: 587,
      secure: false,
      authUser: "",
      hasPassword: false,
      fromEmail: "",
      fromName: "",
      vendorSignatureFileId: null,
    };
  }
  return rowToPublic(r);
}

/**
 * Decrypt `password_encrypted` (AES-256-GCM, key from JWT_ACCESS_SECRET). Falls back to legacy plaintext
 * in that column or in `smtp_password` if decrypt fails / no key.
 */
async function loadStoredSmtpPassword(pool: Pool, config: AppConfig): Promise<string | null> {
  const { rows } = await pool.query<{ smtp_password: string | null; password_encrypted: string | null }>(
    `SELECT smtp_password, password_encrypted::text AS password_encrypted
     FROM public.smtp_settings WHERE id = 1 LIMIT 1`
  );
  const row = rows[0];
  if (!row) return null;
  const enc = row.password_encrypted?.trim();
  const keyHex = smtpPasswordKeyHex(config);
  if (enc && keyHex) {
    try {
      return decryptSmtpPassword(enc, keyHex);
    } catch {
      return enc;
    }
  }
  if (enc) return enc;
  const legacyPlain = row.smtp_password?.trim();
  return legacyPlain || null;
}

export async function upsertSmtpSettings(pool: Pool, input: SmtpUpsertInput, keyHex: string): Promise<SmtpSettingsRow> {
  const pwdTrim = input.password?.trim() ?? "";
  let query: string;
  let values: unknown[];
  if (pwdTrim.length > 0) {
    const ciphertext = encryptSmtpPassword(pwdTrim, keyHex);
    query = `UPDATE public.smtp_settings SET
      host = $1, port = $2, secure = $3, auth_user = $4,
      from_email = $5, from_name = $6,
      password_encrypted = $7,
      smtp_password = '',
      updated_at = now()
      WHERE id = 1
      RETURNING id::text, host, port, secure, auth_user, from_email, from_name,
        vendor_signature_file_id::text AS vendor_signature_file_id,
        (
          (smtp_password IS NOT NULL AND length(btrim(smtp_password)) > 0)
          OR (password_encrypted IS NOT NULL AND length(btrim(password_encrypted::text)) > 0)
        ) AS has_password`;
    values = [input.host.trim(), input.port, input.secure, input.authUser.trim(), input.fromEmail.trim(), input.fromName.trim(), ciphertext];
  } else {
    query = `UPDATE public.smtp_settings SET
      host = $1, port = $2, secure = $3, auth_user = $4,
      from_email = $5, from_name = $6, updated_at = now()
      WHERE id = 1
      RETURNING id::text, host, port, secure, auth_user, from_email, from_name,
        vendor_signature_file_id::text AS vendor_signature_file_id,
        (
          (smtp_password IS NOT NULL AND length(btrim(smtp_password)) > 0)
          OR (password_encrypted IS NOT NULL AND length(btrim(password_encrypted::text)) > 0)
        ) AS has_password`;
    values = [input.host.trim(), input.port, input.secure, input.authUser.trim(), input.fromEmail.trim(), input.fromName.trim()];
  }
  const { rows } = await pool.query<{
    id: string;
    host: string;
    port: number;
    secure: boolean;
    auth_user: string;
    from_email: string;
    from_name: string;
    vendor_signature_file_id: string | null;
    has_password: boolean;
  }>(query, values);
  const out = rows[0];
  if (!out) {
    throw new Error("SMTP settings row is missing. Apply database migrations (smtp_settings).");
  }
  return rowToPublic(out);
}

function createSmtpTransport(opts: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string | null;
}): nodemailer.Transporter {
  const host = opts.host.trim();
  if (!host) {
    throw new Error("SMTP host is required.");
  }
  const auth =
    opts.user.trim().length > 0
      ? {
          user: opts.user.trim(),
          pass: opts.pass ?? "",
        }
      : undefined;
  return nodemailer.createTransport({
    host,
    port: opts.port,
    secure: opts.secure,
    auth,
  });
}

async function verifyTransport(opts: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string | null;
}): Promise<void> {
  await createSmtpTransport(opts).verify();
}

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(s: string): boolean {
  return SIMPLE_EMAIL.test(s.trim());
}

function formatMailFrom(fromName: string | undefined, fromEmail: string | undefined, fallbackEmail: string): string {
  const addr = (fromEmail?.trim() || fallbackEmail.trim()).trim();
  if (!isValidEmail(addr)) {
    throw new Error("From email must be a valid address (set “From email” in SMTP settings).");
  }
  const name = fromName?.trim();
  if (name) {
    const safe = name.replace(/"/g, '\\"');
    return `"${safe}" <${addr}>`;
  }
  return addr;
}

/** Test using explicit fields (password may come from DB if useStoredPassword). */
export async function testSmtpConnection(
  pool: Pool,
  config: AppConfig,
  input: SmtpTestInput
): Promise<{ message: string }> {
  const host = input.host.trim();
  if (!host) {
    throw new Error("SMTP host is required.");
  }
  const user = input.authUser.trim();
  let pass: string | null = null;
  if (user.length > 0) {
    pass = input.password?.trim() ?? null;
    if (input.useStoredPassword && (pass === null || pass === "")) {
      pass = await loadStoredSmtpPassword(pool, config);
      if (pass === null || pass === "") {
        throw new Error("No saved SMTP password to test with.");
      }
    }
    if (pass === null || pass === "") {
      throw new Error("SMTP password is required when a username is set (leave password blank and use “use stored” to test saved credentials).");
    }
  }

  const transportOpts = {
    host,
    port: input.port,
    secure: input.secure,
    user,
    pass: user.length > 0 ? pass : null,
  };

  const sendTo = input.sendTestEmailTo?.trim() ?? "";
  if (!sendTo) {
    await verifyTransport(transportOpts);
    return { message: "SMTP connection verified (no recipient — pass sendTestEmailTo to send a test email)." };
  }
  if (!isValidEmail(sendTo)) {
    throw new Error("sendTestEmailTo must be a valid email address.");
  }

  const fromHeader = formatMailFrom(input.fromName, input.fromEmail, user.length > 0 ? user : sendTo);
  const t = createSmtpTransport(transportOpts);
  await t.verify();
  const sentAt = new Date().toISOString();
  await t.sendMail({
    from: fromHeader,
    to: sendTo,
    subject: "TransactPro — SMTP test email",
    text: `This is a test message sent at ${sentAt}.\nIf you received this, outbound SMTP is configured correctly.`,
    html: `<p>This is a test message sent at <strong>${sentAt}</strong>.</p><p>If you received this, outbound SMTP is configured correctly.</p>`,
  });
  return { message: `Test email sent to ${sendTo}.` };
}

/** Verify the row stored in the database (uses stored password when auth user is set). */
export async function testSmtpSavedSettings(
  pool: Pool,
  config: AppConfig,
  sendTestEmailTo?: string
): Promise<{ message: string }> {
  const row = await getSmtpSettings(pool);
  if (!row.host.trim()) {
    throw new Error("SMTP host is not configured. Save settings first.");
  }
  return testSmtpConnection(pool, config, {
    host: row.host,
    port: row.port,
    secure: row.secure,
    authUser: row.authUser,
    password: null,
    useStoredPassword: true,
    fromEmail: row.fromEmail,
    fromName: row.fromName,
    sendTestEmailTo,
  });
}

function truncateSmtpErrorMessage(message: string, maxLen = 2000): string {
  const s = message.trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 3)}...`;
}

/**
 * Sends one message using the singleton `smtp_settings` row (same transport as test email).
 * From header uses saved from name / from email (falls back to auth user when needed).
 */
export async function sendMailWithStoredSettings(
  pool: Pool,
  config: AppConfig,
  input: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    text: string;
    html?: string;
    attachments?: Array<{ filename: string; path: string }>;
  }
): Promise<{ messageId: string }> {
  const row = await getSmtpSettings(pool);
  if (!row.host.trim()) {
    throw new Error("SMTP host is not configured. Save settings in Settings → Email (SMTP).");
  }
  const user = row.authUser.trim();
  let pass: string | null = null;
  if (user.length > 0) {
    pass = await loadStoredSmtpPassword(pool, config);
    if (pass === null || pass === "") {
      throw new Error("SMTP password is not saved. Update SMTP settings.");
    }
  }
  const toList = (Array.isArray(input.to) ? input.to : [input.to]).map((v) => v.trim()).filter(Boolean);
  if (toList.length === 0 || !toList.every((v) => isValidEmail(v))) {
    throw new Error("At least one valid To recipient is required.");
  }
  const ccList = input.cc
    ? (Array.isArray(input.cc) ? input.cc : [input.cc]).map((v) => v.trim()).filter(Boolean)
    : [];
  const bccList = input.bcc
    ? (Array.isArray(input.bcc) ? input.bcc : [input.bcc]).map((v) => v.trim()).filter(Boolean)
    : [];
  if (ccList.some((v) => !isValidEmail(v)) || bccList.some((v) => !isValidEmail(v))) {
    throw new Error("Cc and Bcc must be valid email addresses.");
  }
  const transportOpts = {
    host: row.host.trim(),
    port: row.port,
    secure: row.secure,
    user,
    pass: user.length > 0 ? pass : null,
  };
  const fromHeader = formatMailFrom(row.fromName, row.fromEmail, user.length > 0 ? user : toList[0]!);
  const t = createSmtpTransport(transportOpts);
  const subject = input.subject.trim();
  if (!subject) {
    throw new Error("Subject is required.");
  }
  const text = input.text.trim();
  if (!text && !input.html?.trim()) {
    throw new Error("Message body is required.");
  }
  try {
    const info = await t.sendMail({
      from: fromHeader,
      to: toList,
      ...(ccList.length ? { cc: ccList } : {}),
      ...(bccList.length ? { bcc: bccList } : {}),
      subject,
      text: text || undefined,
      html: input.html?.trim() || undefined,
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    });
    return { messageId: (info.messageId && String(info.messageId)) || "" };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    throw new Error(truncateSmtpErrorMessage(raw));
  }
}
