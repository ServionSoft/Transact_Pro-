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
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    credentials: true,
  })
);

registerRoutes(app, config);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${config.port}`);
});
