/**
 * One-off / repeatable splitter: reads DB/schema_live.sql and writes
 * backend/db/migration/V00x__*.sql layers. Run from backend:
 *   npx tsx db/extractMigrationsFromSchemaLive.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendRoot, "..");
const dumpPath = path.join(repoRoot, "DB", "schema_live.sql");
const outDir = path.join(__dirname, "migration");

function stripOwnerLines(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !/^\s*ALTER (TABLE|TYPE|SEQUENCE) public\.\w+ OWNER TO postgres;\s*$/.test(line))
    .join("\n");
}

function stripNoise(sql: string): string {
  let s = sql;
  s = s.replace(/^\\restrict.*\r?\n?/gm, "");
  s = s.replace(/^\\unrestrict.*\r?\n?/gm, "");
  return s;
}

function splitTocBlocks(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n");
  const parts = normalized.split(/\n--\n-- TOC entry /);
  const blocks: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const chunk = i === 0 ? parts[i] : `-- TOC entry ${parts[i]}`;
    if (chunk.trim()) blocks.push(chunk);
  }
  return blocks;
}

function classify(block: string): string | null {
  const head = block.slice(0, 500);
  if (/Type: SCHEMA;/.test(head)) return "skip";
  if (/Type: COMMENT;/.test(head) && /SCHEMA public/.test(head)) return "skip";
  if (/CREATE SCHEMA public;/.test(block)) return "skip";
  if (/Type: TYPE; Schema: public/.test(head)) return "enums";
  if (/Type: TABLE; Schema: public/.test(head)) return "tables";
  if (/Type: SEQUENCE OWNED BY;/.test(head)) return "sequences";
  if (/Type: SEQUENCE; Schema: public/.test(head)) return "sequences";
  if (/Type: DEFAULT; Schema: public/.test(head)) return "defaults";
  if (/Type: FK CONSTRAINT; Schema: public/.test(head)) return "fks";
  if (/Type: CONSTRAINT; Schema: public/.test(head)) return "constraints";
  if (/Type: INDEX; Schema: public/.test(head)) return "indexes";
  if (/Type: ACL;/.test(head)) return "skip";
  if (/PostgreSQL database dump complete/.test(block)) return "skip";
  return "skip";
}

function extractExecutableSql(block: string): string {
  const lines = block.split("\n");
  const startIdx = lines.findIndex((l) => /^\s*(CREATE|ALTER|SELECT)\s+/i.test(l));
  if (startIdx < 0) return "";
  return lines.slice(startIdx).join("\n").trim();
}

function main(): void {
  if (!fs.existsSync(dumpPath)) {
    throw new Error(`Missing dump at ${dumpPath}`);
  }
  const raw = stripNoise(fs.readFileSync(dumpPath, "utf8"));
  const blocks = splitTocBlocks(raw);

  const buckets: Record<string, string[]> = {
    enums: [],
    tables: [],
    sequences: [],
    defaults: [],
    constraints: [],
    indexes: [],
    fks: [],
  };

  for (const block of blocks) {
    const kind = classify(block);
    if (!kind || kind === "skip") continue;
    const sql = stripOwnerLines(extractExecutableSql(block));
    if (!sql || !/(CREATE|ALTER|SELECT)/.test(sql)) continue;
    if (kind === "enums" && !/CREATE TYPE/.test(sql)) continue;
    if (kind === "tables" && !/CREATE TABLE/.test(sql)) continue;
    if (kind === "sequences" && !/(CREATE SEQUENCE|ALTER SEQUENCE)/.test(sql)) continue;
    if (kind === "defaults" && !/ALTER TABLE ONLY/.test(sql)) continue;
    if (kind === "constraints" && !/ADD CONSTRAINT/.test(sql)) continue;
    if (kind === "indexes" && !/CREATE (UNIQUE )?INDEX/.test(sql)) continue;
    if (kind === "fks" && !/FOREIGN KEY/.test(sql)) continue;
    buckets[kind].push(sql);
  }

  const header = `-- Generated from DB/schema_live.sql. Regenerate: npm run db:migrate:generate\n\n`;

  fs.mkdirSync(outDir, { recursive: true });

  const files: { name: string; body: string }[] = [
    {
      name: "V001__session.sql",
      body:
        header +
        `SET statement_timeout = 0;\nSET lock_timeout = 0;\nSET client_encoding = 'UTF8';\nSET standard_conforming_strings = on;\nSELECT pg_catalog.set_config('search_path', '', false);\nSET check_function_bodies = false;\n`,
    },
    { name: "V002__enums.sql", body: header + buckets.enums.join("\n\n") + "\n" },
    { name: "V003__tables.sql", body: header + buckets.tables.join("\n\n") + "\n" },
    { name: "V004__sequences.sql", body: header + buckets.sequences.join("\n\n") + "\n" },
    { name: "V005__defaults.sql", body: header + buckets.defaults.join("\n\n") + "\n" },
    {
      name: "V006__primary_keys_and_uniques.sql",
      body: header + buckets.constraints.join("\n\n") + "\n",
    },
    { name: "V007__indexes.sql", body: header + buckets.indexes.join("\n\n") + "\n" },
    { name: "V008__foreign_keys.sql", body: header + buckets.fks.join("\n\n") + "\n" },
  ];

  for (const f of files) {
    fs.writeFileSync(path.join(outDir, f.name), f.body, "utf8");
  }

  // eslint-disable-next-line no-console
  console.log(`Wrote ${files.length} files to ${outDir}`);
}

main();
