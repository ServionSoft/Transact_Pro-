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
import { registerRoutes } from "./routes/index.js";

const config = loadConfig();
const app = express();

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
