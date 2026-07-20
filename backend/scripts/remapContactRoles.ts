/**
 * One-time remap: collapse legacy contact roles into the simplified
 * "Type of Contact" set on public.contacts.agent_role_text.
 *
 * Mapping:
 *   Listing Agent, Buyer's Agent, Dual Agent            -> Agent
 *   Buyer, Seller                                       -> Buyer/Seller
 *   Listing Agent's TC, Buyer's Agent's TC,
 *     Transaction Coordinator                           -> TC
 *   Escrow Officer                                      -> Escrow Officer (unchanged)
 *   Listing Agent Team Member/Assistant,
 *     Buyer's Agent Team Member/Assistant,
 *     Listing Agent's Assistant,
 *     Buyer's Agent's Assistant/Team Member             -> Agent Team Member/Assistant
 *   Escrow Assistant/Team Member, Escrow Assistant      -> Other
 *   Lender, Lender Assistant                            -> Lender
 *   Assistant, Other, anything unrecognized             -> Other
 *
 * Run:
 *   npm run db:remap:contact-roles          # local + render when .env.render exists
 *   npm run db:remap:contact-roles:local    # backend/.env only
 *   npm run db:remap:contact-roles:render   # backend/.env.render only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const localEnvPath = path.join(backendRoot, ".env");
const renderEnvPath = path.join(backendRoot, ".env.render");

type Target = "local" | "render";

/** Exact-match remap for known legacy values. */
const REMAP: Record<string, string> = {
  "Listing Agent": "Agent",
  "Buyer's Agent": "Agent",
  "Dual Agent": "Agent",
  Buyer: "Buyer/Seller",
  Seller: "Buyer/Seller",
  "Listing Agent's TC": "TC",
  "Buyer's Agent's TC": "TC",
  "Transaction Coordinator": "TC",
  "Escrow Officer": "Escrow Officer",
  "Escrow Assistant/Team Member": "Other",
  "Escrow Assistant": "Other",
  "Listing Agent's Assistant": "Agent Team Member/Assistant",
  "Buyer's Agent's Assistant/Team Member": "Agent Team Member/Assistant",
  "Listing Agent Team Member/Assistant": "Agent Team Member/Assistant",
  "Buyer's Agent Team Member/Assistant": "Agent Team Member/Assistant",
  Lender: "Lender",
  "Lender Assistant": "Lender",
  Assistant: "Other",
};

/** Values that are already current — leave untouched. */
const CURRENT = new Set([
  "Agent",
  "TC",
  "Escrow Officer",
  "Buyer/Seller",
  "Agent Team Member/Assistant",
  "Lender",
  "Other",
]);

function maskDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username ? `${u.username}@` : ""}${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
  } catch {
    return "(invalid DATABASE_URL)";
  }
}

function loadDatabaseUrl(target: Target): string {
  const parsed = dotenv.parse(fs.readFileSync(target === "local" ? localEnvPath : renderEnvPath, "utf8"));
  const url = parsed.DATABASE_URL?.trim();
  if (!url) {
    const file = target === "local" ? ".env" : ".env.render";
    throw new Error(`DATABASE_URL is missing in backend/${file}`);
  }
  return url;
}

function resolveTargets(argv: string[]): Target[] {
  const wantsLocal = argv.includes("--local");
  const wantsRender = argv.includes("--render");
  const wantsAll = argv.includes("--all") || (!wantsLocal && !wantsRender);

  const targets: Target[] = [];
  if (wantsAll || wantsLocal) {
    if (!fs.existsSync(localEnvPath)) throw new Error("backend/.env not found");
    targets.push("local");
  }
  if (wantsAll || wantsRender) {
    if (!fs.existsSync(renderEnvPath)) {
      if (wantsRender) throw new Error("backend/.env.render not found");
      // --all without .env.render: local only
    } else {
      targets.push("render");
    }
  }
  if (targets.length === 0) throw new Error("No targets resolved. Use --local, --render, or --all");
  return targets;
}

async function remapOneTarget(target: Target): Promise<void> {
  const databaseUrl = loadDatabaseUrl(target);
  // eslint-disable-next-line no-console
  console.log(`\n=== ${target.toUpperCase()} (${maskDatabaseUrl(databaseUrl)}) ===`);

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Exact-match remap for each known legacy value.
    let changed = 0;
    for (const [from, to] of Object.entries(REMAP)) {
      if (from === to) continue;
      const { rowCount } = await client.query(
        `UPDATE public.contacts
         SET agent_role_text = $2, updated_at = now()
         WHERE btrim(agent_role_text) = $1
           AND deleted_at IS NULL`,
        [from, to]
      );
      if ((rowCount ?? 0) > 0) {
        changed += rowCount ?? 0;
        // eslint-disable-next-line no-console
        console.log(`~ ${from} -> ${to}: ${rowCount}`);
      }
    }

    // Anything non-empty that isn't already a current value -> Other.
    const currentList = [...CURRENT].map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
    const { rowCount: fallbackCount } = await client.query(
      `UPDATE public.contacts
       SET agent_role_text = 'Other', updated_at = now()
       WHERE agent_role_text IS NOT NULL
         AND btrim(agent_role_text) <> ''
         AND btrim(agent_role_text) NOT IN (${currentList})
         AND deleted_at IS NULL`
    );
    if ((fallbackCount ?? 0) > 0) {
      changed += fallbackCount ?? 0;
      // eslint-disable-next-line no-console
      console.log(`~ (unrecognized) -> Other: ${fallbackCount}`);
    }

    await client.query("COMMIT");
    // eslint-disable-next-line no-console
    console.log(`ok  ${target}: ${changed} contact(s) remapped`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main(): Promise<void> {
  const targets = resolveTargets(process.argv.slice(2));
  for (const target of targets) {
    await remapOneTarget(target);
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
