import type { Request } from "express";

/** Base URL for absolute links (e.g. download) when API host differs from the SPA. */
export function publicBaseFromRequest(req: Request): string {
  const fixed = process.env.PUBLIC_API_URL?.trim();
  if (fixed) return fixed.replace(/\/+$/, "");
  const host = req.get("host") || "localhost";
  return `${req.protocol}://${host}`;
}
