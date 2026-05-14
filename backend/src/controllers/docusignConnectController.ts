import type { Request, Response } from "express";
import type { Pool } from "pg";
import type { AppConfig } from "../config/env.js";
import { processDocuSignConnectPayload, verifyConnectHmac } from "../services/docusign/docusignEnvelopeService.js";

export async function handleDocuSignConnect(
  req: Request,
  res: Response,
  config: AppConfig,
  pool: Pool | null,
  uploadDirAbs: string
): Promise<void> {
  if (!pool) {
    res.status(503).json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "Database not configured." } });
    return;
  }

  const raw = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body ?? ""));
  const sig =
    (req.headers["x-docusign-signature-1"] as string | undefined) ??
    (req.headers["X-DocuSign-Signature-1"] as string | undefined);

  if (!verifyConnectHmac(config, raw, sig)) {
    res.status(401).send("Invalid signature");
    return;
  }

  const rawText = raw.toString("utf8").slice(0, 100_000);
  res.status(200).send("OK");
  void processDocuSignConnectPayload(pool, config, uploadDirAbs, raw, rawText).catch((e) => {
    const msg = e instanceof Error ? e.message : "Connect handler failed.";
    // eslint-disable-next-line no-console
    console.error("[docusign connect]", msg);
  });
}
