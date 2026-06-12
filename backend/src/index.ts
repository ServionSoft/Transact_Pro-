import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
dotenv.config({ path: path.join(backendRoot, ".env") });
import cors from "cors";
import { loadConfig } from "./config/env.js";
import { getPool } from "./db/pool.js";
import { registerRoutes } from "./routes/index.js";
import { handleDocuSignConnect } from "./controllers/docusignConnectController.js";
import { isDevLanOrigin } from "./utils/devCors.js";

const config = loadConfig();
const app = express();
const pool = getPool(config.databaseUrl);
const uploadDirAbs = path.resolve(config.uploadDir);

app.post(
  "/api/docusign/connect",
  express.raw({ type: "*/*", limit: "25mb" }),
  (req, res) => {
    void handleDocuSignConnect(req, res, config, pool, uploadDirAbs);
  }
);

app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!config.corsOrigins.length || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (config.nodeEnv === "development" && isDevLanOrigin(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

registerRoutes(app, config);

function firstLanIPv4(): string | undefined {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      const isV4 = String(iface.family) === "IPv4";
      if (isV4 && !iface.internal) return iface.address;
    }
  }
  return undefined;
}

app.listen(config.port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${config.port}`);
  const lan = firstLanIPv4();
  if (lan) {
    // eslint-disable-next-line no-console
    console.log(`API on LAN: http://${lan}:${config.port} (phone must use Vite :8080, not this URL directly)`);
  }
  if (config.docusignAccountId && config.docusignIntegrationKey) {
    // eslint-disable-next-line no-console
    console.log(
      `DocuSign: account_id=${config.docusignAccountId} base=${config.docusignBasePath} — if .env changed, restart this process (watch mode often skips .env reloads).`
    );
  }
});
