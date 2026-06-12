/**
 * Apply migrations using only backend/.env (ignores .env.render).
 * Use when local Postgres and Render use different DATABASE_URL values.
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

async function ensureMigrationsTable(client: pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id serial PRIMARY KEY,
      name varchar(512) NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function isApplied(client: pg.PoolClient, name: string): Promise<boolean> {
  const { rows } = await client.query<{ n: string }>(
    `SELECT 1 AS n FROM public.schema_migrations WHERE name = $1 LIMIT 1`,
    [name]
  );
  return rows.length > 0;
}

async function recordApplied(client: pg.PoolClient, name: string): Promise<void> {
  await client.query(`INSERT INTO public.schema_migrations (name) VALUES ($1)`, [name]);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing. Set it in backend/.env");
  }

  const migrationDir = path.join(__dirname, "migration");
  const files = fs
    .readdirSync(migrationDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    for (const file of files) {
      if (await isApplied(client, file)) {
        // eslint-disable-next-line no-console
        console.log(`skip ${file}`);
        continue;
      }
      const fullPath = path.join(migrationDir, file);
      const raw = fs.readFileSync(fullPath, "utf8");
      const sql = stripFullLineComments(raw);
      const statements = splitSqlStatements(sql);
      if (statements.length === 0) {
        throw new Error(`${file}: no SQL statements found`);
      }
      await client.query("BEGIN");
      try {
        for (const st of statements) {
          await client.query(st);
        }
        await recordApplied(client, file);
        await client.query("COMMIT");
        // eslint-disable-next-line no-console
        console.log(`ok  ${file}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
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
