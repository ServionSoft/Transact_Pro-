import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 16;
const TAG_LEN = 16;
const VERSION = Buffer.from([1]);

function keyBuffer(keyHex: string): Buffer {
  const key = Buffer.from(keyHex.trim(), "hex");
  if (key.length !== 32) {
    throw new Error("SMTP password encryption key must be 32 bytes (64 hex characters).");
  }
  return key;
}

/** Deterministic 32-byte key as 64 hex chars (AES-256), derived from JWT signing secret — not stored in DB. */
export function deriveSmtpPasswordKeyHex(jwtAccessSecret: string): string {
  return crypto.createHash("sha256").update(jwtAccessSecret.trim(), "utf8").digest("hex");
}

/** Returns base64 ciphertext: version(1) + iv(16) + tag(16) + cipher */
export function encryptSmtpPassword(plain: string, keyHex: string): string {
  const key = keyBuffer(keyHex);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([VERSION, iv, tag, enc]).toString("base64");
}

export function decryptSmtpPassword(b64: string, keyHex: string): string {
  const key = keyBuffer(keyHex);
  const raw = Buffer.from(b64.trim(), "base64");
  if (raw.length < 1 + IV_LEN + TAG_LEN + 1) {
    throw new Error("Invalid encrypted secret payload.");
  }
  const version = raw[0];
  if (version !== 1) {
    throw new Error("Unsupported encrypted secret version.");
  }
  const iv = raw.subarray(1, 1 + IV_LEN);
  const tag = raw.subarray(1 + IV_LEN, 1 + IV_LEN + TAG_LEN);
  const data = raw.subarray(1 + IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LEN });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
