/**
 * Apply Compass task column SQL to the database in backend/.env only (same as the API).
 * Ignores schema_migrations — safe to re-run. Use when migrate skipped V045–V047
 * on this DB but columns are still missing (e.g. migrate ran against Render via .env.render).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { splitSqlStatements } from "./sqlSplit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(backendRoot, ".env") });

function stripFullLineComments(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !/^\s*--/.test(line))
    .join("\n");
}

function maskDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username ? `${u.username}@` : ""}${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
  } catch {
    return "(invalid DATABASE_URL)";
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing. Set it in backend/.env");
  }

  const repairPath = path.join(__dirname, "migration", "V047__compass_tasks_repair.sql");
  const raw = fs.readFileSync(repairPath, "utf8");
  const statements = splitSqlStatements(stripFullLineComments(raw));
  if (statements.length === 0) {
    throw new Error("V047 repair file has no SQL statements");
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ db: string }>("SELECT current_database() AS db");
    const dbName = rows[0]?.db ?? "?";
    // eslint-disable-next-line no-console
    console.log(`Repair target: ${maskDatabaseUrl(databaseUrl)} (database: ${dbName})`);

    const colCheck = await client.query<{ ok: string }>(
      `SELECT 1::text AS ok
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'project_tasks'
         AND column_name = 'task_section'
       LIMIT 1`
    );
    const hadColumn = colCheck.rows.length > 0;
    // eslint-disable-next-line no-console
    console.log(hadColumn ? "task_section already exists — applying idempotent repair anyway" : "task_section missing — repairing");

    await client.query("BEGIN");
    try {
      for (const st of statements) {
        await client.query(st);
      }
      await client.query("COMMIT");
      // eslint-disable-next-line no-console
      console.log("ok  compass task columns + email template keys repaired");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
